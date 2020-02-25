const checkout = new AdyenCheckout(window.Configuration);
const cardNode = document.getElementById('card');
var oneClickCard = [];
var card;
var idealComponent;
var afterpayComponent;
var klarnaComponent;
var isValid = false;
var storeDetails;
var maskedCardNumber;
const MASKED_CC_PREFIX = '************';
var oneClickValid = false;

renderOneClickComponents();
renderGenericComponent();

function renderGenericComponent(){
    GetCheckoutPaymentMethods(function(data){
        var paymentMethodsResponse = JSON.stringify(data.AdyenPaymentMethods);

        var scripts = `
              <script type="module" src="https://unpkg.com/generic-component@0.0.21/dist/adyen-checkout/adyen-checkout.esm.js"></script>
              <script nomodule src="https://unpkg.com/generic-component@0.0.21/dist/adyen-checkout/adyen-checkout.js"></script>
           `;

        var componentNode = ` 
                         <adyen-checkout
                                locale="${window.Configuration.locale}"
                                environment="${window.Configuration.environment}"
                                origin-key="${window.Configuration.originKey}"
                                payment-methods='${paymentMethodsResponse}'
                                >
                            <adyen-payment-method-card></adyen-payment-method-card>
                        </adyen-checkout>
                        `;

        $('head').append(scripts);
        $('#adyen-webcomponent').append(componentNode);

        const myComponent = document.querySelector('adyen-checkout');
        // const logEvent = ({ detail }) => {
        //     console.log(detail.state.data);
        //     $("#adyenStateData").val(JSON.stringify(detail.state.data));
        // }
        myComponent.addEventListener('adyenChange', adyenOnChange);
        myComponent.addEventListener('adyenBrand', adyenOnBrand);
        myComponent.addEventListener('adyenFieldValid', adyenOnFieldValid);
    })
}

function adyenOnChange(response) {
    var stateData = response.detail.state.data;
    $("#adyenStateData").val(JSON.stringify(stateData));
}

function adyenOnBrand(response) {
    var brand = response.detail.state.brand;
    $("#cardType").val(brand);
}

function adyenOnFieldValid(response) {
    if(response.detail.state.endDigits){
        var endDigits = response.detail.state.endDigits;
        var maskedCardNumber = `${MASKED_CC_PREFIX}${endDigits}`;
        console.log(maskedCardNumber);
        $("#cardNumber").val(maskedCardNumber);
        console.log($("#cardNumber").val());
    }
}

function GetCheckoutPaymentMethods(paymentMethods) {
    $.ajax({
        url: 'Adyen-GetCheckoutPaymentMethods',
        type: 'get',
        success: function (data) {
            paymentMethods(data);
        }
    });
};

function renderOneClickComponents() {
    var componentContainers = document.getElementsByClassName("cvc-container");
    jQuery.each(componentContainers, function (i, oneClickCardNode) {
        var container = document.getElementById(oneClickCardNode.id);
        var cardId = container.id.split("-")[1];
        var brandCode = document.getElementById('cardType-' + cardId).value;
        oneClickCard[cardId] = checkout.create('card', {
            // Specific for oneClick cards
            brand: brandCode,
            storedPaymentMethodId: cardId,
            onChange: function (state) {
                oneClickValid = state.isValid;
                if (state.isValid) {
                    $('#browserInfo').val(JSON.stringify(state.data.browserInfo));
                    $('#adyenEncryptedSecurityCode').val(state.data.paymentMethod.encryptedSecurityCode);
                }
            } // Gets triggered whenever a user changes input
        }).mount(container);
    });
};

$('.payment-summary .edit-button').on('click', function (e) {
    jQuery.each(oneClickCard, function (i) {
        oneClickCard[i].unmount();
    });
    renderOneClickComponents();
    oneClickValid = false;
});

function displayPaymentMethods() {
    $('#paymentMethodsUl').empty();
    getPaymentMethods(function (data) {
        console.log(data);
        jQuery.each(data.AdyenPaymentMethods, function (i, method) {
            addPaymentMethod(method, data.ImagePath, data.AdyenDescriptions[i].description);
        });

        $('input[type=radio][name=brandCode]').change(function () {
            console.log($(this).val());
            resetPaymentMethod();
            $('#component_' + $(this).val()).show();
        });

        if(data.AdyenConnectedTerminals && data.AdyenConnectedTerminals.uniqueTerminalIds && data.AdyenConnectedTerminals.uniqueTerminalIds.length > 0){
            $('#AdyenPosTerminals').empty();
            addPosTerminals(data.AdyenConnectedTerminals.uniqueTerminalIds);
        }
    });
};

function addPosTerminals(terminals) {
    //create dropdown and populate connected terminals
    var dd_terminals = $("<select>").attr("id", "terminalList");
    for(var i=0; i< terminals.length;i++) {
        $("<option/>", {
            value: terminals[i],
            html: terminals[i]
        }).appendTo(dd_terminals);
    }
    $('#AdyenPosTerminals').append(dd_terminals);
}
function resetPaymentMethod() {
    $('#requiredBrandCode').hide();
    $('#selectedIssuer').val("");
    $('#adyenIssuerName').val("");
    $('#dateOfBirth').val("");
    $('#telephoneNumber').val("");
    $('#gender').val("");
    $('#bankAccountOwnerName').val("");
    $('#bankAccountNumber').val("");
    $('#bankLocationId').val("");
    $('.additionalFields').hide();
};

function getPaymentMethods(paymentMethods) {
    $.ajax({
        url: 'Adyen-GetPaymentMethods',
        type: 'get',
        success: function (data) {
            paymentMethods(data);
        }
    });
};

function addPaymentMethod(paymentMethod, imagePath, description) {
    var li = $('<li>').addClass('paymentMethod');
    li.append($('<input>')
        .attr('id', 'rb_' + paymentMethod.name)
        .attr('type', 'radio')
        .attr('name', 'brandCode')
        .attr('value', paymentMethod.type));
    li.append($('<img>').addClass('paymentMethod_img').attr('src', imagePath + paymentMethod.type + '.png'));
    li.append($('<label>').text(paymentMethod.name).attr('for', 'rb_' + paymentMethod.name));
    li.append($('<p>').text(description));

    if (paymentMethod.type == 'ratepay') {
        var ratepayContainer = document.createElement("div");
        $(ratepayContainer).addClass('additionalFields').attr('id', 'component_' + paymentMethod.type).attr('style', 'display:none');

        var genderLabel = document.createElement("span");
        $(genderLabel).text("Gender").attr('class', 'adyen-checkout__label');
        var genderInput = document.createElement("select");
        $(genderInput).attr('id', 'genderInput').attr('class', 'adyen-checkout__input');

        //Create array of options to be added
        var genders = {'M': 'Male','F': 'Female'};

        for (var key in genders) {
            var option = document.createElement("option");
            option.value = key;
            option.text = genders[key];
            genderInput.appendChild(option);
        }

        var dateOfBirthLabel = document.createElement("span");
        $(dateOfBirthLabel).text("Date of birth").attr('class', 'adyen-checkout__label');
        var dateOfBirthInput = document.createElement("input");
        $(dateOfBirthInput).attr('id', 'dateOfBirthInput').attr('class', 'adyen-checkout__input').attr('type', 'date');

        ratepayContainer.append(genderLabel);
        ratepayContainer.append(genderInput);
        ratepayContainer.append(dateOfBirthLabel);
        ratepayContainer.append(dateOfBirthInput);

        li.append(ratepayContainer);
    }

    else if (paymentMethod.type.substring(0, 3) == "ach") {
       const fallback =
              `<slot name="fallback">
                <span class="adyen-checkout__label">Bank Account Owner Name</span>
                <input type="text" id="bankAccountOwnerNameValue" class="adyen-checkout__input">
                <span class="adyen-checkout__label">Bank Account Number</span>
                <input type="text" id="bankAccountNumberValue" class="adyen-checkout__input" maxlength="17">
                <span class="adyen-checkout__label">Routing Number</span>
                <input type="text" id="bankLocationIdValue" class="adyen-checkout__input" maxlength="9">
              </slot>`;

        const genericPaymentMethodComponent = document.createElement('adyen-payment-method-generic');
        $(genericPaymentMethodComponent).attr('type', paymentMethod.type)
            .addClass('additionalFields')
            .attr('id', 'component_' + paymentMethod.type)
            .attr('style', 'display:none')
            .append(fallback);
        li.append(genericPaymentMethodComponent);
    }

    else {
        const genericPaymentMethodComponent = document.createElement('adyen-payment-method-generic');
        $(genericPaymentMethodComponent).attr('type', paymentMethod.type)
            .addClass('additionalFields')
            .attr('id', 'component_' + paymentMethod.type)
            .attr('style', 'display:none');
        li.append(genericPaymentMethodComponent);
    }

    $('#paymentMethodsUl').append(li);
};


//Filter fields for open invoice validation
function filterOutOpenInvoiceComponentDetails(details) {
    var filteredDetails = details.map(function (detail) {
        if (detail.key == "personalDetails") {
            var detailObject = detail.details.map(function (childDetail) {
                if (childDetail.key == 'dateOfBirth' ||
                    childDetail.key == 'gender') {
                    return childDetail;
                }
            });

            if (!!detailObject) {
                return {
                    "key": detail.key,
                    "type": detail.type,
                    "details": filterUndefinedItemsInArray(detailObject)
                };
            }
        }
    });

    return filterUndefinedItemsInArray(filteredDetails);
};

/**
 * Helper function to filter out the undefined items from an array
 * @param arr
 * @returns {*}
 */
function filterUndefinedItemsInArray(arr) {
    return arr.filter(function (item) {
        return typeof item !== 'undefined';
    });
};

function isNordicCountry(country) {
    if (country === "SE" || country === "FI" || country === "DK" || country === "NO") {
        return true;
    }
    return false;
};

//Submit the payment
    $('button[value="submit-payment"]').on('click', function (e) {
        // $.ajax({
        //     url: 'CheckoutServices-SubmitPayment',
        //     type: 'POST',
        //     data: { test: 'testDataBasZaid'},
        //     success: function(response){
        //         console.log(response);
        //     },
        //     error: function(){
        //         console.log("error");
        //     }
        // });

    return true;
    // if ($('#selectedPaymentOption').val() == 'CREDIT_CARD') {
    //     //new card payment
    //     if ($('.payment-information').data('is-new-payment')) {
    //         if (!isValid) {
    //             card.showValidation();
    //             return false;
    //         } else {
    //             $('#selectedCardID').val('');
    //             setPaymentData();
    //         }
    //     }
    //     //oneclick payment
    //     else {
    //         var uuid = $('.selected-payment').data('uuid');
    //         var selectedOneClick = oneClickCard[uuid];
    //         if (!selectedOneClick.state.isValid) {
    //             selectedOneClick.showValidation();
    //             return false;
    //         } else {
    //             var selectedCardType = document.getElementById('cardType-' + uuid).value;
    //             document.getElementById('saved-payment-security-code-' + uuid).value = "000";
    //             $('#cardType').val(selectedCardType)
    //             $('#selectedCardID').val($('.selected-payment').data('uuid'));
    //             return true;
    //         }
    //     }
    // } else if ($('#selectedPaymentOption').val() == 'Adyen') {
    //     var selectedMethod = $("input[name='brandCode']:checked");
    //     //no payment method selected
    //     if (!adyenPaymentMethodSelected(selectedMethod.val())) {
    //         $('#requiredBrandCode').show();
    //         return false;
    //     }
    //     //check component details
    //     else {
    //         var componentState = checkComponentDetails(selectedMethod);
    //         $('#adyenPaymentMethod').val($("input[name='brandCode']:checked").attr('id').substr(3));
    //         return componentState;
    //     }
    // } else if ($('#selectedPaymentOption').val() == 'AdyenPOS') {
    //     $("#terminalId").val($("#terminalList").val());
    // }
    // return true;
});

function checkComponentDetails(selectedMethod) {
    //set data from components
    if (selectedMethod.val() == "ideal") {
        if (idealComponent.componentRef.state.isValid) {
            $('#selectedIssuer').val(idealComponent.componentRef.state.data.issuer);
            $('#adyenIssuerName').val(idealComponent.componentRef.props.items.find(x => x.id == idealComponent.componentRef.state.data.issuer).name);
        }
        return idealComponent.componentRef.state.isValid;
    } else if (selectedMethod.val().indexOf("klarna") > -1 && klarnaComponent) {
        if (klarnaComponent.componentRef.state.isValid) {
            setOpenInvoiceData(klarnaComponent);
            if ($('#ssnValue')) {
                $('#socialSecurityNumber').val($('#ssnValue').val());
            }
        }
        return klarnaComponent.componentRef.state.isValid;
    } else if (selectedMethod.val().indexOf("afterpay_default") > -1) {
        if (afterpayComponent.componentRef.state.isValid) {
            setOpenInvoiceData(afterpayComponent);
        }
        return afterpayComponent.componentRef.state.isValid;
    }
    else if (selectedMethod.val() == 'ratepay') {
        if ($('#genderInput').val() && $('#dateOfBirthInput').val()) {
            $('#gender').val($('#genderInput').val());
            $('#dateOfBirth').val($('#dateOfBirthInput').val());
            return true;
        }

        return false;
    }
    //if issuer is selected
    else if (selectedMethod.closest('li').find('.additionalFields #issuerList').val()) {
        $('#selectedIssuer').val(selectedMethod.closest('li').find('.additionalFields #issuerList').val());
        $('#adyenIssuerName').val(selectedMethod.closest('li').find('.additionalFields #issuerList').find('option:selected').attr('label'));
    } else if (selectedMethod.val().substring(0, 3) == "ach") {
        $('#bankAccountOwnerName').val($('#bankAccountOwnerNameValue').val());
        $('#bankAccountNumber').val($('#bankAccountNumberValue').val());
        $('#bankLocationId').val($('#bankLocationIdValue').val());

        if (!$('#bankLocationIdValue').val() || !$('#bankAccountNumberValue').val() || !$('#bankAccountOwnerNameValue').val()) {
            return false;
        }
    }

    return true;
}

function setOpenInvoiceData(component) {
    if(component.componentRef.state.data.personalDetails){
        if(component.componentRef.state.data.personalDetails.dateOfBirth){
            $('#dateOfBirth').val(component.componentRef.state.data.personalDetails.dateOfBirth);
        }
        if(component.componentRef.state.data.personalDetails.gender){
            $('#gender').val(component.componentRef.state.data.personalDetails.gender);
        }
        if(component.componentRef.state.data.personalDetails.telephoneNumber){
            $('#telephoneNumber').val(component.componentRef.state.data.personalDetails.telephoneNumber);
        }
    }
}

function adyenPaymentMethodSelected(selectedMethod) {
    if (!selectedMethod) {
        return false;
    }
    return true;
}

$('button[value="add-new-payment"]').on('click', function (e) {
    setPaymentData();
});

function setPaymentData() {
    $('#adyenEncryptedCardNumber').val(card.state.data.encryptedCardNumber);
    $('#adyenEncryptedExpiryMonth').val(card.state.data.encryptedExpiryMonth);
    $('#adyenEncryptedExpiryYear').val(card.state.data.encryptedExpiryYear);
    $('#adyenEncryptedSecurityCode').val(card.state.data.encryptedSecurityCode);
    $('#cardOwner').val(card.state.data.holderName);
    $('#cardNumber').val(maskedCardNumber || "");
    $('#saveCardAdyen').val(storeDetails || false);
}

module.exports = {
    methods: {
        displayPaymentMethods: displayPaymentMethods
    }
};