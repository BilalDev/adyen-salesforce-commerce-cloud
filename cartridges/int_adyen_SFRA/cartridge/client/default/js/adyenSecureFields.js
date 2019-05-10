    const configuration = {
        locale: $('#currentLocale').val(), // Defaults to en_US
        translations: {} // Override translations
    };

    const checkout = new AdyenCheckout(configuration);
    const cardNode = document.getElementById('card');
    var card;
    var isValid = false;
    getConfigurationSecureFields();

    var originKey = "";
    var loadingContext = "";
    function setConfigData(data, callback){
        originKey = data.adyenOriginKey[Object.keys(data.adyenOriginKey)[0]];
        loadingContext = data.adyenLoadingContext;
        callback();
    };

    function renderCardComponent() {
        card = checkout.create('card', {
            // Mandatory fields
            originKey: originKey,
            loadingContext: loadingContext, // The environment where we should loads the secured fields from
            type: 'card',

            // Events
            onChange: function(state) {
                isValid = state.isValid;
            }, // Gets triggered whenever a user changes input
            onBrand: function(brandObject) {
                $('#cardType').val(brandObject.brand);
            }, // Called once we detect the card brand
            onBinValue: function(bin) {
                $('#cardNumber').val(bin.binValue);
            } // Provides the BIN Number of the card (up to 6 digits), called as the user types in the PAN
        });
        card.mount(cardNode);
    };

    function getConfigurationSecureFields() {
        $.ajax({
            url: 'Adyen-GetConfigSecuredFields',
            type: 'get',
            data: {protocol : window.location.protocol},
            success: function (data) {
                if(!data.error){
                    setConfigData(data, function() {
                        renderCardComponent();
                    });
                }
                else {
                    $('#errorLoadComponent').text(data.errorMessage);
                }
            }
        });
    };


    $('button[value="submit-payment"]').on('click', function (e) {
        if($('#selectedPaymentOption').val() == 'CREDIT_CARD') {
            if(!isValid){
                return false;
            }
            else {
                $('#adyenEncryptedCardNumber').val(card.paymentData.encryptedCardNumber);
                $('#adyenEncryptedExpiryMonth').val(card.paymentData.encryptedExpiryMonth);
                $('#adyenEncryptedExpiryYear').val(card.paymentData.encryptedExpiryYear);
                $('#adyenEncryptedSecurityCode').val(card.paymentData.encryptedSecurityCode);
            }
        }
    });



