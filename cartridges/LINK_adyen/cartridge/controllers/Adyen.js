'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var adyenHelpers = require('*/cartridge/scripts/checkout/adyenHelpers');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');

server.get('Adyen3D', server.middleware.https, function (req, res, next) {
  var IssuerURL = req.querystring.IssuerURL;
  var PaRequest = req.querystring.PaRequest;
  var MD = req.querystring.MD;
  var TermURL = URLUtils.https('Adyen-AuthorizeWithForm');

  res.render('adyenform', {
    issuerUrl: IssuerURL,
    paRequest: PaRequest,
    md: MD,
    ContinueURL: TermURL
  });
  next();
});

server.post('AuthorizeWithForm', server.middleware.https, function (req, res, next) {
  var adyen3DVerification = require('int_adyen/cartridge/scripts/adyen3DVerification');
  var order = session.custom.order;
  var paymentInstrument = session.custom.paymentInstrument;
  if (session.custom.MD == req.form.MD) {
    var result = adyen3DVerification.verify({
      Order: order,
      Amount: paymentInstrument.paymentTransaction.amount,
      CurrentRequest: req.request,
      MD: req.form.MD,
      PaResponse: req.form.PaRes
    });

    // if error, return to checkout page
    if (result.error || result.Decision != 'ACCEPT') {
      Transaction.wrap(function () {
        OrderMgr.failOrder(order);
      });
      res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'paymentError', Resource.msg('error.payment.not.valid', 'checkout', null)));
      return next();
    }

    //custom fraudDetection
    var fraudDetectionStatus = {status: 'success'};

    // Places the order
    var placeOrderResult = adyenHelpers.placeOrder(order, fraudDetectionStatus);
      if (placeOrderResult.error) {
      Transaction.wrap(function () {
        OrderMgr.failOrder(order);
      });
      res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder', 'paymentError', Resource.msg('error.technical', 'checkout', null)));
      return next();
    }

    Transaction.begin();
    order.setPaymentStatus(dw.order.Order.PAYMENT_STATUS_PAID);
    order.setExportStatus(dw.order.Order.EXPORT_STATUS_READY);
    paymentInstrument.paymentTransaction.transactionID = result.RequestToken;
    Transaction.commit();
    COHelpers.sendConfirmationEmail(order, req.locale.id);
    clearForms();
    res.redirect(URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString());
    return next();
  }

  res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'paymentError', Resource.msg('error.payment.not.valid', 'checkout', null)));
  return next();
});

server.get('Redirect', server.middleware.https, function (req, res, next) {
  var	adyenVerificationSHA256 = require('int_adyen/cartridge/scripts/adyenRedirectVerificationSHA256');


  var result;
  var order = OrderMgr.getOrder(session.custom.orderNo);
  Transaction.wrap(function () {
    result = adyenVerificationSHA256.verify({
      Order: order,
      OrderNo: order.orderNo,
      CurrentSession: session,
      CurrentUser: customer,
      PaymentInstrument: order.paymentInstrument,
      brandCode: session.custom.brandCode,
      issuerId: session.custom.issuerId
    });
  });

  if (result === PIPELET_ERROR) {
    res.render('error');
    return next();
  }

  var pdict = {
    merchantSig:	result.merchantSig,
    Amount100: result.Amount100,
    shopperEmail: result.shopperEmail,
    shopperReference: result.shopperReference,
    ParamsMap: result.paramsMap,
    SessionValidity: result.sessionValidity,
    Order: order,
    OrderNo: order.orderNo
  };

  res.render('redirectHPP', pdict);
  return next();
});

server.get('ShowConfirmation', server.middleware.https, function (req, res, next) {
  var order = null;
  if (req.querystring.merchantReference) {
    order = OrderMgr.getOrder(req.querystring.merchantReference.toString());
  }

  if (req.querystring.authResult.value != 'CANCELLED') {
    var requestMap = new Array();
    for (var item in req.querystring) {
      if (item !== 'toString') {
        requestMap[item] = req.querystring[item];
      }
    }

    var authorizeConfirmation = require('int_adyen/cartridge/scripts/authorizeConfirmationCallSHA256');
    var authorized = authorizeConfirmation.authorize(requestMap);
    if (!authorized) {
      res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'paymentError', Resource.msg('error.payment.not.valid', 'checkout', null)));
      return next();
    }
  }
  // AUTHORISED: The payment authorisation was successfully completed.
  if (req.querystring.authResult == 'AUTHORISED') {
    Transaction.begin();
    order.setConfirmationStatus(dw.order.Order.CONFIRMATION_STATUS_CONFIRMED);
    order.setPaymentStatus(dw.order.Order.PAYMENT_STATUS_PAID);
    order.setExportStatus(dw.order.Order.EXPORT_STATUS_READY);
    Transaction.commit();
    COHelpers.sendConfirmationEmail(order, req.locale.id);
    clearForms();
    res.redirect(URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString());
    return next();
  }

  Transaction.wrap(function () {
    OrderMgr.failOrder(order);
  });

  res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'paymentError', Resource.msg('error.payment.not.valid', 'checkout', null)));
  return next();
});

server.get('GetPaymentMethods', server.middleware.https, function (req, res, next) {
  var BasketMgr = require('dw/order/BasketMgr');
  var getPaymentMethods = require('*/cartridge/scripts/getPaymentMethodsSHA256');
  var paymentMethods;
  try {
    paymentMethods = getPaymentMethods.getMethods(BasketMgr.getCurrentBasket()).paymentMethods;
  } catch (err) {
    paymentMethods = [];
  }

  res.json({
    AdyenHppPaymentMethods: paymentMethods,
    ImagePath: URLUtils.staticURL('/images/').toString()
  });
  return next();
});

/**
 * Get OriginKey for Secured Fields
 */
server.get('GetConfigSecuredFields', server.middleware.https, function (req, res, next) {
    var adyenHelper = require('*/cartridge/scripts/util/AdyenHelper');
    var	adyenGetOriginKey = require('*/cartridge/scripts/adyenGetOriginKey');
    var baseUrl = req.querystring.protocol + "//" + Site.getCurrent().getHttpsHostName();
    var originKey;
    var loadingContext = "";

    try {
        originKey = adyenGetOriginKey.getOriginKey(baseUrl).originKeys;
        loadingContext = adyenHelper.getLoadingContext();
    } catch (err) {
        originKey = [];
    }
    res.json({
        adyenOriginKey: originKey,
        adyenLoadingContext: loadingContext
    });
    return next();
});

/**
 * Clear system session data
 */
function clearForms() {
  // Clears all forms used in the checkout process.
  session.forms.billing.clearFormElement();

  clearCustomSessionFields();
}

/**
 * Clear custom session data
 */
function clearCustomSessionFields() {
  // Clears all fields used in the 3d secure payment.
  session.custom.paymentInstrument = null;
  session.custom.order = null;
  session.custom.brandCode = null;
  session.custom.issuerId = null;
}

module.exports = server.exports();
