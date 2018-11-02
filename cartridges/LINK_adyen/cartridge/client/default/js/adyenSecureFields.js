    const configuration = {
        locale: 'en_US', // Defaults to en_US
        translations: {} // Override translations
    };

    const checkout = new AdyenCheckout(configuration);
    const cardNode = document.getElementById('card');

    getConfigurationSecureFields();

    var originKey = "";
    var loadingContext = "";
    function setConfigData(data){
        originKey = data.adyenOriginKey[Object.keys(data.adyenOriginKey)[0]];
        loadingContext = data.adyenLoadingContext;
    };

    function getConfigurationSecureFields() {
        $.ajax({
            url: 'Adyen-GetConfigSecuredFields',
            type: 'get',
            data: {protocol : window.location.protocol},
            success: function (data) {
                setConfigData(data);
            },
            complete: function(){
                const card = checkout.create('card', {

                    // Mandatory fields
                    originKey: originKey,
                    loadingContext: loadingContext, // The environment where we should loads the secured fields from
                    type: 'card',

                    // Events
                    onChange: function() {}, // Gets triggered whenever a user changes input
                    onValid : function() {}, // Gets triggered when all fields are valid.
                    onLoad: function() {}, // Called once all the secured fields have been created (but are not yet ready to use)
                    onConfigSuccess: function() {}, // Called once the secured fields are ready to use
                    onFieldValid : function() {}, // Called as a specific secured field is validated and encrypted.
                    onBrand: function() {}, // Called once we detect the card brand
                    onError: function() {}, // Called in the case of invalid card number / invalid expiry date / incomplete field.
                    onFocus: function() {}, // Called when a secured field gains or loses focus
                    onBinValue: function(bin) {} // Provides the BIN Number of the card (up to 6 digits), called as the user types in the PAN
                });
                card.mount(cardNode);
            }
        });
    }

