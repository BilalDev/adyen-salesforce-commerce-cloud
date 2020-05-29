/**
 *
 */

'use strict';
var collections = require('*/cartridge/scripts/util/collections');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var AdyenHelper = require('*/cartridge/scripts/util/AdyenHelper');
var Logger = require('dw/system/Logger');
var constants = require("*/cartridge/adyenConstants/constants");

function Handle(basket, paymentInformation) {
    var currentBasket = basket;
    var cardErrors = {};
    var serverErrors = [];
    Transaction.wrap(function () {
        collections.forEach(currentBasket.getPaymentInstruments(), function (item) {
            currentBasket.removePaymentInstrument(item);
        });
        var paymentInstrument = currentBasket.createPaymentInstrument(constants.METHOD_ADYEN_COMPONENT, currentBasket.totalGrossPrice);
        paymentInstrument.custom.adyenPaymentData = paymentInformation.stateData;
        paymentInstrument.custom.adyenPaymentMethod = paymentInformation.adyenPaymentMethod;

        if (paymentInformation.isCreditCard) {
            var sfccCardType = AdyenHelper.getSFCCCardType(paymentInformation.cardType);
            var tokenID = AdyenHelper.getCardToken(paymentInformation.storedPaymentUUID, customer);

            paymentInstrument.setCreditCardNumber(paymentInformation.cardNumber);
            paymentInstrument.setCreditCardType(sfccCardType);

            if (tokenID) {
                paymentInstrument.setCreditCardExpirationMonth(paymentInformation.expirationMonth.value);
                paymentInstrument.setCreditCardExpirationYear(paymentInformation.expirationYear.value);
                paymentInstrument.setCreditCardToken(tokenID);
            }
        } else {
            //Local payment data
            if (paymentInformation.adyenIssuerName) {
                paymentInstrument.custom.adyenIssuerName = paymentInformation.adyenIssuerName;
            }
        }
    });

    return {fieldErrors: cardErrors, serverErrors: serverErrors, error: false};
}

/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var Transaction = require("dw/system/Transaction");
    var OrderMgr = require("dw/order/OrderMgr");
    var order = OrderMgr.getOrder(orderNumber);

    var adyenCheckout = require("*/cartridge/scripts/adyenCheckout");
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });

    Transaction.begin();
    var result = adyenCheckout.createPaymentRequest({
        Order: order,
        PaymentInstrument: paymentInstrument
    });
    if (result.error) {
        var errors = [];
        errors.push(Resource.msg("error.payment.processor.not.supported", "checkout", null));
        return {
            authorized: false, fieldErrors: [], serverErrors: errors, error: true
        };
    }
    //Trigger 3DS2 flow
    if(result.threeDS2 || result.resultCode == "RedirectShopper"){
        paymentInstrument.custom.adyenPaymentData = result.paymentData;
        Transaction.commit();

        session.privacy.orderNo = order.orderNo;
        session.privacy.paymentMethod = paymentInstrument.paymentMethod;

        if(result.threeDS2){
            return {
                threeDS2: result.threeDS2,
                resultCode: result.resultCode,
                token3ds2: result.token3ds2
            }
        }

        var signature = null;
        var authorized3d = false;

        //If the response has MD, then it is a 3DS transaction
        if(result.redirectObject && result.redirectObject.data && result.redirectObject.data.MD){
            authorized3d = true;
        }
        else {
            //Signature only needed for redirect methods
            signature = AdyenHelper.getAdyenHash(result.redirectObject.url, result.paymentData);
        }

        return {
            authorized: true,
            authorized3d: authorized3d,
            orderNo: orderNumber,
            paymentInstrument: paymentInstrument,
            redirectObject: result.redirectObject,
            signature: signature
        };
    }

    else if(result.decision != "ACCEPT"){
        Logger.getLogger("Adyen").error("Payment failed, result: " + JSON.stringify(result));
        Transaction.rollback();
        return { error: true };
    }
    AdyenHelper.savePaymentDetails(paymentInstrument, order, result.fullResponse);
    Transaction.commit();
    return { authorized: true, error: false };

}

exports.Handle = Handle;
exports.Authorize = Authorize;