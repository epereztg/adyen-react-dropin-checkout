import React, { Component } from "react";
import ReactDOM from "react-dom";
import authorization from "./authorization.json";
import "./styles.css";

const MERCHANT_ACCOUNT = authorization.merchantAccount
const CHECKOUT_APIKEY = authorization.checkout_apikey

const paymentMethodsConfig = {
    shopperReference: 'Checkout Components sample code test',
    reference: 'Checkout Components sample code test',
    countryCode: 'NL',
    merchantAccount: MERCHANT_ACCOUNT,
    amount: {
        value: 3000,
        currency: 'EUR'
    },
    channel: "Web"
};

const paymentsDefaultConfig = {
    locale: navigator.language,
    merchantAccount: MERCHANT_ACCOUNT,
    reference: "Your order number",
    countryCode: "NL",
    shopperReference: 'Checkout Components sample code test',
    shopperEmail: "shopperEmail@email.com",
    returnUrl: 'https://www.test-merchant.com',
    amount: {
        value: 2000,
        currency: 'EUR'
    },
    lineItems: [
        {
            id: '1',
            description: 'Test Item 1',
            amountExcludingTax: 10000,
            amountIncludingTax: 11800,
            taxAmount: 1800,
            taxPercentage: 1800,
            quantity: 1,
            taxCategory: 'High'
        }
    ]
};

const httpPost = (endpoint, data) =>
    fetch(`https://cors-anywhere.herokuapp.com/https://checkout-test.adyen.com/v50/${endpoint}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'X-Api-Key': CHECKOUT_APIKEY,
        },

        body: JSON.stringify(data)
    })
        .then(response => response.json())
    ;

// Get all available payment methods from the local server
const getPaymentMethods = () =>
    httpPost('paymentMethods', paymentMethodsConfig)
        .then(response => {
            if (response.error) throw new Error("No paymentMethods available");

            return response;
        })
        .catch(console.error);

// Posts a new payment into the local server
const makePayment = (paymentMethod, config = {}) => {
    const paymentsConfig = { ...paymentsDefaultConfig, ...config };
    const paymentRequest = { ...paymentsConfig, ...paymentMethod };

    return httpPost('payments', paymentRequest)
        .then(response => {
            if (response.error) throw new Error("Payment initiation failed");
            return response;
        })
        .catch(console.error);
};

const makeDetailsCall = (paymentMethod, config = {}) => {
    const paymentsConfig = { ...paymentsDefaultConfig, ...config };
    const paymentRequest = { ...paymentsConfig, ...paymentMethod };

    return httpPost('payments/details', paymentRequest)
        .then(response => {
            if (response.error) throw new Error("Payment initiation failed");
            return response;
        })
        .catch(console.error);
};

const originKeysConfig = {
    originDomains: [
        'https://localhost:44301'
    ]
};

const getOriginKey = () =>
    httpPost('originKeys', originKeysConfig)
        .then(response => {
            console.log('originkeys', response.originKeys);

            if (response.error || !response.originKeys) throw new Error("No originKey available");
            return response.originKeys[Object.keys(response.originKeys)[0]];
        })
        .catch(console.error);

class AdyenDropin extends Component {
    constructor(props) {
        super(props);
        this.initAdyenCheckout = this.initAdyenCheckout.bind(this);
    }

    componentDidMount() {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href =
            "https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/3.0.0/adyen.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src =
            "https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/3.3.0/adyen.js";
        script.async = true;


        script.onload = this.initAdyenCheckout(); // Wait until the script is loaded before initiating AdyenCheckout

        document.body.appendChild(script);
    }


    async initAdyenCheckout() {
        let paymentMethodsResponse = await getPaymentMethods();
        let originKey = await getOriginKey();

        const configuration = {
            locale: "en_US",
            environment: "test",
            originKey: originKey,
            paymentMethodsResponse: paymentMethodsResponse,
            amount: {
                value: 1000,
                currency: "EUR"
            }
        };

        const checkout = new window.AdyenCheckout(configuration);


        checkout
            .create("dropin", {
                paymentMethodsConfiguration: {
                    applepay: { // Example required configuration for Apple Pay
                        configuration: {
                            merchantName: 'Adyen Test merchant', // Name to be displayed on the form
                            merchantIdentifier: 'adyen.test.merchant' // Your Apple merchant identifier as described in https://developer.apple.com/documentation/apple_pay_on_the_web/applepayrequest/2951611-merchantidentifier
                        },
                        onValidateMerchant: (resolve, reject, validationURL) => {
                            // Call the validation endpoint with validationURL.
                            // Call resolve(MERCHANTSESSION) or reject() to complete merchant validation.
                        }
                    },
                    paywithgoogle: { // Example required configuration for Google Pay
                        environment: "TEST", // Change this to PRODUCTION when you're ready to accept live Google Pay payments
                        configuration: {
                            gatewayMerchantId: "YourCompanyOrMerchantAccount", // Your Adyen merchant or company account name. Remove this field in TEST.
                            merchantIdentifier: "12345678910111213141" // Required for PRODUCTION. Remove this field in TEST. Your Google Merchant ID as described in https://developers.google.com/pay/api/web/guides/test-and-deploy/deploy-production-environment#obtain-your-merchantID
                        }
                    },
                    card: { // Example optional configuration for Cards
                        hasHolderName: true,
                        holderNameRequired: true,
                        enableStoreDetails: true,
                        name: 'Credit or debit card'
                    }
                },
                onSubmit: (state, dropin) => {                    
                    makePayment(state.data)
                        // Your function calling your server to make the /payments request
                        .then(action => {
                            //let paymentData = action.paymentData;
                            //if (state.isValid) { console.log('State is valid. Handle payment...'); dropin.handleAction(action) } else console.log('state is not valid')

                            // Drop-in handles the action object from the /payments response                                
                            console.log('action', action)
                        })
                        .catch(error => {
                            throw new Error(error);
                        });
                },
                onAdditionalDetails: (state, dropin) => {
                    makeDetailsCall(state.data)
                        // Your function calling your server to make a /payments/details request
                        .then(action => {
                            dropin.handleAction(action);
                            // Drop-in handles the action object from the /payments/details response
                        })
                        .catch(error => {
                            throw Error(error);
                        });
                }
            })
            .mount(this.ref);
    }

    render() {
        return (
            <div
                ref={ref => {
                    this.ref = ref;
                }}
            />
        );
    }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<AdyenDropin />, rootElement);

