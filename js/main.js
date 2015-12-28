
    //oc:   launch chrome with Web Security turned off
    //      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security
var response;
var myCoupon;
var retailerSelectBox = {};

    function onload(){ 
      console.log('onload');
      myCoupon = document.getElementById('coupon');
      myCoupon.addEventListener('FETCH_DATA_COMPLETE', onFetchData);

    }

    function onFetchData(){
      console.info('onFetchData');

      //oc: 
      $('#success').show();
      //oc: populate select
      var sel = document.getElementById('retailers_select');
      sel.innerHTML = '';

      //oc: we're using the 1st offer for testing.
      myCoupon.currentOfferId = myCoupon.offers[0]['offerId'];
      
      //oc: populate select box with current offer's retailers
      var merchantIds = myCoupon.offers[0]['merchantIds']['ns1:int'];
      for (var i = 0; i < merchantIds.length; i++) {
        var name = myCoupon.retailers[merchantIds[i]]['name'];
        var value = merchantIds[i];
        var opt = document.createElement('option'); // create new option element
        // create text node to add to option element (opt)
        opt.appendChild(document.createTextNode(name));
        opt.value = value; // set value property of opt
        sel.appendChild(opt); // add opt to end of select box (sel)
      }//end for
    }//end function

    function onSubmitClick(event){
        var offerId = myCoupon.offers[0]['offerId'];
        var loyalty = document.getElementById('loyalty').value;
        merchantId = document.getElementById('retailers_select').value;
        var loyaltyDataObj = {};
        loyaltyDataObj['mod:id'] = 1;
        loyaltyDataObj['mod:value'] = loyalty;
      
        myCoupon.addLoyaltyInfo(loyaltyDataObj, merchantId);
    }//end function
    function onGetActiveClick(event){
        var merchantId = 69; //oc: document.getElementById('retailers_select').value;
        myCoupon.getActiveCoupons(merchantId);
    }//end function onGetActiveClick