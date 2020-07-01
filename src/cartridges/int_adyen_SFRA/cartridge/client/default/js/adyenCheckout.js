const { renderPaymentMethod } = require("./helpers/renderPaymentMethod");
// eslint-disable-next-line no-unused-vars
let maskedCardNumber;
const MASKED_CC_PREFIX = "************";
let selectedMethod;
const componentsObj = {};
const checkoutConfiguration = window.Configuration;
let formErrorsExist;
let isValid = false;
let checkout;

$("#dwfrm_billing").submit(function (e) {
  e.preventDefault();

  const form = $(this);
  const url = form.attr("action");

  $.ajax({
    type: "POST",
    url: url,
    data: form.serialize(),
    async: false,
    success: function (data) {
      formErrorsExist = "fieldErrors" in data;
    },
  });
});

checkoutConfiguration.onChange = function (state) {
  const type = state.data.paymentMethod.type;
  isValid = state.isValid;
  if (!componentsObj[type]) {
    componentsObj[type] = {};
  }
  componentsObj[type].isValid = isValid;
  componentsObj[type].stateData = state.data;
};
checkoutConfiguration.showPayButton = false;
checkoutConfiguration.paymentMethodsConfiguration = {
  card: {
    enableStoreDetails: showStoreDetails,
    onBrand: function (brandObject) {
      document.querySelector("#cardType").value = brandObject.brand;
    },
    onFieldValid: function (data) {
      if (data.endDigits) {
        maskedCardNumber = MASKED_CC_PREFIX + data.endDigits;
        document.querySelector("#cardNumber").value = maskedCardNumber;
      }
    },
    onChange: function (state) {
      isValid = state.isValid;
      const componentName = state.data.paymentMethod.storedPaymentMethodId
        ? `storedCard${state.data.paymentMethod.storedPaymentMethodId}`
        : state.data.paymentMethod.type;
      if (componentName === selectedMethod) {
        componentsObj[selectedMethod].isValid = isValid;
        componentsObj[selectedMethod].stateData = state.data;
      }
    },
  },
  boletobancario: {
    personalDetailsRequired: true, // turn personalDetails section on/off
    billingAddressRequired: false, // turn billingAddress section on/off
    showEmailAddress: false, // allow shopper to specify their email address

    // Optionally prefill some fields, here all fields are filled:
    data: {
      firstName: document.getElementById("shippingFirstNamedefault").value,
      lastName: document.getElementById("shippingLastNamedefault").value,
    },
  },
  paypal: {
    environment: window.Configuration.environment,
    intent: "capture",
    onSubmit: (state, component) => {
      assignPaymentMethodValue();
      document.querySelector("#adyenStateData").value = JSON.stringify(
        componentsObj[selectedMethod].stateData
      );
      paymentFromComponent(state.data, component);
    },
    onCancel: (data, component) => {
      paymentFromComponent({ cancelTransaction: true }, component);
      component.setStatus("ready");
    },
    onError: (error, component) => {
      if (component) {
        component.setStatus("ready");
      }
    },
    onAdditionalDetails: (state) => {
      document.querySelector("#additionalDetailsHidden").value = JSON.stringify(
        state.data
      );
      document.querySelector("#showConfirmationForm").submit();
    },
    onClick: (data, actions) => {
      $("#dwfrm_billing").trigger("submit");
      if (formErrorsExist) {
        return actions.reject();
      }
    },
  },
  afterpay_default: {
    visibility: {
      personalDetails: "editable",
      billingAddress: "hidden",
      deliveryAddress: "hidden",
    },
    data: {
      personalDetails: {
        firstName: document.querySelector("#shippingFirstNamedefault").value,
        lastName: document.querySelector("#shippingLastNamedefault").value,
        telephoneNumber: document.querySelector("#shippingPhoneNumberdefault")
          .value,
        shopperEmail: document.querySelector("#email").value,
      },
    },
  },
  facilypay_3x: {
    visibility: {
      personalDetails: "editable",
      billingAddress: "hidden",
      deliveryAddress: "hidden",
    },
    data: {
      personalDetails: {
        firstName: document.querySelector("#shippingFirstNamedefault").value,
        lastName: document.querySelector("#shippingLastNamedefault").value,
        telephoneNumber: document.querySelector("#shippingPhoneNumberdefault")
          .value,
        shopperEmail: document.querySelector("#email").value,
      },
    },
  },
};
if (window.installments) {
  try {
    const installments = JSON.parse(window.installments);
    checkoutConfiguration.paymentMethodsConfiguration.card.installments = installments;
  } catch (e) {} // eslint-disable-line no-empty
}
if (window.paypalMerchantID !== "null") {
  checkoutConfiguration.paymentMethodsConfiguration.paypal.merchantId =
    window.paypalMerchantID;
}

function displaySelectedMethod(type) {
  selectedMethod = type;
  resetPaymentMethod();
  if (type !== "paypal") {
    document.querySelector('button[value="submit-payment"]').disabled = false;
  } else {
    document.querySelector('button[value="submit-payment"]').disabled = true;
  }
  document
    .querySelector(`#component_${type}`)
    .setAttribute("style", "display:block");
}

function unmountComponents() {
  const promises = Object.entries(componentsObj).map(function ([key, val]) {
    delete componentsObj[key];
    return resolveUnmount(key, val);
  });
  return Promise.all(promises);
}

function resolveUnmount(key, val) {
  try {
    return Promise.resolve(val.node.unmount(`component_${key}`));
  } catch (e) {
    // try/catch block for val.unmount
    return Promise.resolve(false);
  }
}

function isMethodTypeBlocked(methodType) {
  const blockedMethods = [
    "bcmc_mobile_QR",
    "applepay",
    "cup",
    "wechatpay",
    "wechatpay_pos",
    "wechatpaySdk",
    "wechatpayQr",
  ];
  return blockedMethods.includes(methodType);
}

async function renderGenericComponent() {
  if (Object.keys(componentsObj).length !== 0) {
    await unmountComponents();
  }
  getPaymentMethods(function (data) {
    let paymentMethod;
    let i;
    checkoutConfiguration.paymentMethodsResponse = data.AdyenPaymentMethods;
    if (data.amount) {
      checkoutConfiguration.amount = data.amount;
    }
    if (data.countryCode) {
      checkoutConfiguration.countryCode = data.countryCode;
    }
    checkout = new AdyenCheckout(checkoutConfiguration);

    document.querySelector("#paymentMethodsList").innerHTML = "";

    if (data.AdyenPaymentMethods.storedPaymentMethods) {
      for (
        i = 0;
        i < checkout.paymentMethodsResponse.storedPaymentMethods.length;
        i++
      ) {
        paymentMethod = checkout.paymentMethodsResponse.storedPaymentMethods[i];
        if (paymentMethod.supportedShopperInteractions.includes("Ecommerce")) {
          renderPaymentMethod({
            paymentMethod,
            isStored: true,
            imgPath: data.ImagePath,
          });
        }
      }
    }

    data.AdyenPaymentMethods.paymentMethods.forEach((pm, i) => {
      !isMethodTypeBlocked(pm.type) &&
        renderPaymentMethod({
          paymentMethod: pm,
          isStored: false,
          imgPath: data.ImagePath,
          description: data.AdyenDescriptions[i].description,
        });
    });

    if (
      data.AdyenConnectedTerminals &&
      data.AdyenConnectedTerminals.uniqueTerminalIds &&
      data.AdyenConnectedTerminals.uniqueTerminalIds.length > 0
    ) {
      const posTerminals = document.querySelector("#adyenPosTerminals");
      while (posTerminals.firstChild) {
        posTerminals.removeChild(posTerminals.firstChild);
      }
      addPosTerminals(data.AdyenConnectedTerminals.uniqueTerminalIds);
    }
    const firstPaymentMethod = document.querySelector(
      "input[type=radio][name=brandCode]"
    );
    firstPaymentMethod.checked = true;
    displaySelectedMethod(firstPaymentMethod.value);
  });
}

// eslint-disable-next-line no-unused-vars
function addPosTerminals(terminals) {
  const dd_terminals = document.createElement("select");
  dd_terminals.id = "terminalList";
  for (const t in terminals) {
    const option = document.createElement("option");
    option.value = terminals[t];
    option.text = terminals[t];
    dd_terminals.appendChild(option);
  }
  document.querySelector("#adyenPosTerminals").append(dd_terminals);
}

function resetPaymentMethod() {
  $("#requiredBrandCode").hide();
  $("#selectedIssuer").val("");
  $("#adyenIssuerName").val("");
  $("#dateOfBirth").val("");
  $("#telephoneNumber").val("");
  $("#gender").val("");
  $("#bankAccountOwnerName").val("");
  $("#bankAccountNumber").val("");
  $("#bankLocationId").val("");
  $(".additionalFields").hide();
}

function getPaymentMethods(paymentMethods) {
  $.ajax({
    url: "Adyen-GetPaymentMethods",
    type: "get",
    success: function (data) {
      paymentMethods(data);
    },
  });
}

function paymentFromComponent(data, component) {
  $.ajax({
    url: "Adyen-PaymentFromComponent",
    type: "post",
    data: { data: JSON.stringify(data) },
    success: function (data) {
      if (data.fullResponse && data.fullResponse.action) {
        component.handleAction(data.fullResponse.action);
      } else {
        component.setStatus("ready");
        component.reject("Payment Refused");
      }
    },
  }).fail(function () {});
}

//Submit the payment
$('button[value="submit-payment"]').on("click", function () {
  if (document.querySelector("#selectedPaymentOption").value === "AdyenPOS") {
    document.querySelector("#terminalId").value = document.querySelector(
      "#terminalList"
    ).value;
    return true;
  }

  assignPaymentMethodValue();
  validateComponents();
  return showValidation();
});

function assignPaymentMethodValue() {
  const adyenPaymentMethod = document.querySelector("#adyenPaymentMethodName");
  adyenPaymentMethod.value = document.querySelector(
    `#lb_${selectedMethod}`
  ).innerHTML;
}

function showValidation() {
  let input;
  if (componentsObj[selectedMethod] && !componentsObj[selectedMethod].isValid) {
    componentsObj[selectedMethod].node.showValidation();
    return false;
  } else if (selectedMethod === "ach") {
    let inputs = document.querySelectorAll("#component_ach > input");
    inputs = Object.values(inputs).filter(function (input) {
      return !(input.value && input.value.length > 0);
    });
    for (input of inputs) {
      input.classList.add("adyen-checkout__input--error");
    }
    if (inputs.length > 0) {
      return false;
    }
    return true;
  } else if (selectedMethod === "ratepay") {
    input = document.querySelector("#dateOfBirthInput");
    if (!(input.value && input.value.length > 0)) {
      input.classList.add("adyen-checkout__input--error");
      return false;
    }
    return true;
  }
  return true;
}

function validateCustomInputField(input) {
  if (input.value === "") {
    input.classList.add("adyen-checkout__input--error");
  } else if (input.value.length > 0) {
    input.classList.remove("adyen-checkout__input--error");
  }
}

function validateComponents() {
  if (document.querySelector("#component_ach")) {
    const inputs = document.querySelectorAll("#component_ach > input");
    for (const input of inputs) {
      input.onchange = function () {
        validateCustomInputField(this);
      };
    }
  }
  if (document.querySelector("#dateOfBirthInput")) {
    document.querySelector("#dateOfBirthInput").onchange = function () {
      validateCustomInputField(this);
    };
  }

  let stateData;
  if (
    componentsObj[selectedMethod] &&
    componentsObj[selectedMethod].stateData
  ) {
    stateData = componentsObj[selectedMethod].stateData;
  } else {
    stateData = { paymentMethod: { type: selectedMethod } };
  }

  if (selectedMethod === "ach") {
    const bankAccount = {
      ownerName: document.querySelector("#bankAccountOwnerNameValue").value,
      bankAccountNumber: document.querySelector("#bankAccountNumberValue")
        .value,
      bankLocationId: document.querySelector("#bankLocationIdValue").value,
    };
    stateData.paymentMethod = {
      ...stateData.paymentMethod,
      bankAccount: bankAccount,
    };
  } else if (selectedMethod === "ratepay") {
    if (
      document.querySelector("#genderInput").value &&
      document.querySelector("#dateOfBirthInput").value
    ) {
      stateData.shopperName = {
        gender: document.querySelector("#genderInput").value,
      };
      stateData.dateOfBirth = document.querySelector("#dateOfBirthInput").value;
    }
  }
  document.querySelector("#adyenStateData").value = JSON.stringify(stateData);
}

module.exports = {
  methods: {
    renderGenericComponent: renderGenericComponent,
  },
};
