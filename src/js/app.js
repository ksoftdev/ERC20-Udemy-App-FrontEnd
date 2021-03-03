App = {
    web3Provider: null,
    contracts: {},
    loading: false,
    tokenPrice: 0,
    tokensSold: 0,
    tokensAvailable: 0,
    logging_output: true,

    init: function() {
        if (App.logging_output){console.log("App has been initialized.");}
        return App.initWeb3();
    },

    initWeb3: function() {
        // App.web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
        // Is there is an injected web3 instance?
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            // If no injected web3 instance is detected, fallback to Truffle Develop.
            App.web3Provider = new web3.providers.HttpProvider('http://127.0.0.1:7545');
            web3 = new Web3(App.web3Provider);
        }
        if (App.logging_output){console.log('PROVIDER: ', App.web3Provider)}
        return App.initContracts();
    },

    initContracts: function() {
        $.getJSON("DappTokenSale.json", function(DappTokenSale)
        {
            App.contracts.DappTokenSale = TruffleContract(DappTokenSale);
            App.contracts.DappTokenSale.setProvider(App.web3Provider);
            App.contracts.DappTokenSale.deployed().then(function(DappTokenSale)
            {
                if (App.logging_output){console.log("Dapp Token Sale Address:", DappTokenSale.address)}
            });
        }).done(function()
        {
            $.getJSON("DappToken.json", function(DappToken)
            {
                App.contracts.DappToken = TruffleContract(DappToken);
                App.contracts.DappToken.setProvider(App.web3Provider);
                App.contracts.DappToken.deployed().then(function(DappToken)
                {
                    if (App.logging_output){console.log("Dapp Token Address:", DappToken.address)}
                });
                App.listenForEvents();
                return App.render();
            });
        })
    },

    // Listen for events emitted from the contract
    listenForEvents: function() {
        /*
        App.contracts.DappTokenSale.deployed().then(function(instance)
        {
            instance.Sell({}, {
                fromBlock: 0,
                toBlock: 'latest',
            }).watch(function(error, event)
            {
                if (App.logging_output){console.log("EVENT TRIGGERED", event)};
                App.render();
            })
        })
        */

        // watch the Transfer event
        App.contracts.DappTokenSale.deployed().then(function(instance)
        {
          instance.Sell()
          .on('data', event => {
                if (App.logging_output){console.log("EVENT TRIGGERED", event)};
                App.render();
            });
        });
    },

    render: function() {
        if (App.loading){return;}

        App.loading = true;

        var loader  = $('#loader');
        var content = $('#content');

        loader.show();
        content.hide();

        // GET ACCOUNTS
        //const accounts = ethereum.request({ method: 'eth_requestAccounts' });
        //const account = accounts[0];

        web3.eth.getCoinbase(function(err, account) {
          if(err === null) {
            $('#accountAddress').html("Your Account: " + App.web3Provider.selectedAddress);
          }
        })

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
            //$('.dapp-balance').html(25000);
            App.loading = false;
            loader.hide();
            content.show();
        });
    },

    // FIX BUYER ACCOUNT
    buyTokens: function() {
        $('#content').hide();
        $('#loader').show();

        var numberOfTokens = $('#numberOfTokens').val();
        /*
        App.contracts.DappTokenSale.deployed().then(function(instance)
        {
        }).then(function(tokenPrice)
        {
        */
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
                console.log('BUY USER ACCOUNT: ', App.web3Provider.selectedAddress);
                console.log('BUY USER ACCOUNT BALANCE: ', balance.toNumber());
                console.log('BUY NUMBER OF TOKENS: ', numberOfTokens);
                console.log('BUY TOKEN PRICE: ', App.tokenPrice);
            }

            return DappTokenSaleInstance.buyTokens(numberOfTokens, {
                from: App.web3Provider.selectedAddress,
                value: numberOfTokens * App.tokenPrice,
                gas: 500000 // Gas limit
            });
        }).then(function(result)
        {
            if (App.logging_output){console.log("Tokens bought.")}
            // reset number of tokens in form
            //$('form').trigger('reset');
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
