App = {
    web3Provider: null,
    contracts: {},
    loading: false,
    tokenPrice: 0,
    tokensSold: 0,
    tokensAvailable: 0,
    logging_output: true,

    init: function() {
        if (App.logging_output){console.log("APP HAS BEEN INITIALIZED.");}
        return App.initWeb3();
    },

    initWeb3: function() {
        // Is there is an injected web3 instance?
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            // If no injected web3 instance is detected, fallback to Truffle Develop.
            App.web3Provider = new web3.providers.HttpProvider('http://127.0.0.1:7545');
            web3 = new Web3(App.web3Provider);
        }
        if (App.logging_output){console.log('USING PROVIDER: ', App.web3Provider);}
        return App.initContracts();
    },

    initContracts: function() {
        $.getJSON("DappTokenSale.json", function(DappTokenSale)
        {
            App.contracts.DappTokenSale = TruffleContract(DappTokenSale);
            App.contracts.DappTokenSale.setProvider(App.web3Provider);
            App.contracts.DappTokenSale.deployed().then(function(DappTokenSale)
            {
                if (App.logging_output){console.log("DAPP TOKEN SALE ADDRESS:", DappTokenSale.address);}
            });
        }).done(function()
        {
            $.getJSON("DappToken.json", function(DappToken)
            {
                App.contracts.DappToken = TruffleContract(DappToken);
                App.contracts.DappToken.setProvider(App.web3Provider);
                App.contracts.DappToken.deployed().then(function(DappToken)
                {
                    if (App.logging_output){console.log("DAPP TOKEN ADDRESS:", DappToken.address);}
                });
                App.listenForEvents();
                return App.render();
            });
        });
    },

    // TODO *FIX MetaMask - RPC Error: MetaMask Tx Signature: User denied transaction signature.*
    // Listen for events emitted from the contract
    listenForEvents: function() {

        // watch the Transfer event
        App.contracts.DappTokenSale.deployed().then(function(instance)
        {

            return instance.Sell()
            .on('data', event => {
                if (App.logging_output){console.log("EVENT TRIGGERED", event)};
                App.render();
            });
            /*
            return instance.Sell(function(error, result) {
                if (!error){
                    if (App.logging_output){console.log('EVENT TRIGGERED: ', result);}
                    App.render();
                }
            });
            */
        });
    },

    render: function() {
        if (App.loading){return;}

        App.loading = true;

        var loader  = $('#loader');
        var content = $('#content');

        loader.show();
        content.hide();

        $('#accountAddress').html("Your Account: " + App.web3Provider.selectedAddress);
        if (App.logging_output){console.log('USER ACCOUNT: ', App.web3Provider.selectedAddress);}

        // Load contracts
        App.contracts.DappToken.deployed().then(function(instance)
        {
            // Grab token instance first
            DappTokenInstance = instance;
            return App.contracts.DappTokenSale.deployed();
        }).then(function(instance)
        {
            // Grab token sale instance
            DappTokenSaleInstance = instance;
            return DappTokenSaleInstance.getTokenPrice();
        }).then(function(tokenPrice)
        {
            App.tokenPrice = tokenPrice;
            $('.token-price').html(web3.utils.fromWei(App.tokenPrice, "ether"));
            return DappTokenInstance.balanceOf(DappTokenSaleInstance.address);
        }).then(function(balance)
        {
            App.tokensAvailable = balance.toNumber();
            return DappTokenSaleInstance.getTokensSold();
        }).then(function(tokensSold)
        {
            App.tokensSold = tokensSold.toNumber();
            $('.tokens-sold').html(App.tokensSold);
            $('.tokens-available').html(App.tokensAvailable);

            var progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
            $('#progress').css('width', progressPercent + '%');

            return DappTokenInstance.balanceOf(App.web3Provider.selectedAddress);
        }).then(function(balance)
        {
            $('.dapp-balance').html(balance.toNumber());
            if (App.logging_output){console.log('USER ACCOUNT BALANCE: ', balance.toNumber());}
            App.loading = false;
            loader.hide();
            content.show();
        });
    },

    buyTokens: function() {
        $('#content').hide();
        $('#loader').show();

        var numberOfTokens = $('#numberOfTokens').val();

        App.contracts.DappToken.deployed().then(function(instance)
        {
            // Grab token instance first
            DappTokenInstance = instance;
            return App.contracts.DappTokenSale.deployed();
        }).then(function(instance)
        {
            // Grab token sale instance
            DappTokenSaleInstance = instance;
            return DappTokenInstance.balanceOf(App.web3Provider.selectedAddress);
        }).then(function(balance)
        {
            if (App.logging_output){
                console.log('BUYER USER ACCOUNT: ', App.web3Provider.selectedAddress);
                console.log('BUYER USER ACCOUNT BALANCE: ', balance.toNumber());
                console.log('BUYER NUMBER OF TOKENS: ', numberOfTokens);
                console.log('BUYER TOKEN PRICE: ', App.tokenPrice);
            }

            return DappTokenSaleInstance.buyTokens(numberOfTokens, {
                from: App.web3Provider.selectedAddress,
                value: numberOfTokens * App.tokenPrice,
                gas: 500000 // Gas limit
            }).catch(function(error)
            {
              if (App.logging_output){console.log('GOT AN ERROR: ', error.message);}
              $('form').trigger('reset');
              App.render();
            });
        }).then(function(result)
        {
            if (App.logging_output){console.log("TOKENS BOUGHT: ", result);}
            // reset number of tokens in form
            $('form').trigger('reset');
            // Wait for Sell event
        });
    }
}

$(function() {
    $(window).load(function()
    {
        App.init();
    })
});
