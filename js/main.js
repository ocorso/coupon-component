//oc:   launch chrome with Web Security turned off
//      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security
var response;
var myCoupon;
var retailerSelectBox = {};

//oc: which offer to test with?
var offerIndex = 1;

function onload(){ 
  console.log('onload');

  //oc: grap coupon component from the DOM
  myCoupon = document.getElementById('my_coupon');

  //oc: add event listeners
  myCoupon.addEventListener('FETCH_DATA_COMPLETE', onFetchData);
  myCoupon.addEventListener('SHOW_DIALOG', showDialogHandler);
}

function onFetchData(){
  console.info('onFetchData');

  //oc: show happy green text
  $('#success').show();

  //oc: populate select box
  var sel = document.getElementById('retailers_select');
  sel.innerHTML = '';

  //oc: we're using the 1st offer for testing.
  myCoupon.currentOfferId = myCoupon.offers[offerIndex]['offerId'];
  
  //oc: populate select box with current offer's retailers
  var merchantIds = myCoupon.offers[offerIndex]['merchantIds']['ns1:int'];
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

function onAddLoyaltyClick(event){
  var offerId = myCoupon.offers[offerIndex]['offerId'];
  var loyalty = document.getElementById('loyalty').value;
  merchantId = document.getElementById('retailers_select').value;
  var loyaltyDataObj = {};
  loyaltyDataObj['mod:id'] = 1;//oc: loyalty Id 1 is a loyalty #
  loyaltyDataObj['mod:value'] = loyalty;
  
  myCoupon.addLoyaltyInfo(loyaltyDataObj, merchantId);
}//end function

function showDialogHandler(event){
  console.info('showDialogHandler');
  console.debug(event.detail);
  alert(event.detail.description);
}
   