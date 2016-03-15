//oc:   launch chrome with Web Security turned off
//      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security
var myCoupon;
var offersSelectBoxElement;
var retailerSelectBoxElement;
var validationFieldsElement;
var merchantNamesInDMA = {
    'Kroger' : 1,
    'Meijer': 1,
    'Dollar General': 1,
    'Giant Eagle': 1,
    'Rite Aid': 1,
    'SafeWay': 1,
    'Save Mart': 1,
    'Shop \'n Save': 1,
    'Shoppers': 1,
    'Star Market': 1,
    'Valu Market':1
};

function onload(){ 
  console.log('onload');

  //oc: grap coupon component from the DOM
  myCoupon = document.getElementById('my_coupon');

  //oc: need to swap fields based on what auth retailer supports.
  validationFieldsElement = document.getElementById('validation_fields');

  //oc: add event listeners
  myCoupon.addEventListener('FETCH_DATA_COMPLETE', onFetchData);
  myCoupon.addEventListener('MESSAGE_RECEIVED', showDialogHandler);

  //oc: offers select box
  offersSelectBoxElement = document.getElementById('offers_select');
  offersSelectBoxElement.addEventListener('change', updateRetailerSelectBox);

  //oc: retailer select box
  retailerSelectBoxElement = document.getElementById('retailers_select');
  retailerSelectBoxElement.addEventListener('change', updateLoyaltyFields);
}

function updateRetailerSelectBox(event){
  console.info('updateRetailerSelectBox');
  //oc: clear out old values
  retailerSelectBoxElement.innerHTML = '';

  //oc: set current offer from UI.
  myCoupon.currentOfferId = myCoupon.offers[offersSelectBoxElement.value]['offerId'];
  
  //oc: populate select box with current offer's retailers
  var merchantIds = myCoupon.offers[offersSelectBoxElement.value]['merchantIds']['int'];
  for (var i = 0; i < merchantIds.length; i++) {

    //oc: filter by retailers within specified DMA
    if(true){//checkRetailer(merchantIds[i])){//oc: only show retailers in DMA
      var name = myCoupon.retailers[merchantIds[i]]['name'];
      var value = merchantIds[i];
      var opt = document.createElement('option'); // create new option element
      // create text node to add to option element (opt)
      opt.appendChild(document.createTextNode(name));
      opt.value = value; // set value property of opt
      retailerSelectBoxElement.appendChild(opt); // add opt to end of retailerSelectBoxElement
    }
  }//end for

 //oc: sort the merchants
    $(retailerSelectBoxElement).html($("#retailers_select option").sort(function(a, b) {
        return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
    }))
    
  updateLoyaltyFields();
};

/*
 * Write a function that determines if the merchant can appear.
 * 
 * Merchants in DMA:
      Kroger
      Meijer
      Dollar General
      Giant Eagle
      Rite Aid
      SafeWay
      Save Mart
      Shop N Save : Shop 'n Save
      Shoppers
      Star Market
      Valu Market
 */
function checkRetailer(merchantId){
  var nameToCheck = myCoupon.retailers[merchantId]['name'];
  console.log('name to check: '+nameToCheck);
  var isFound = merchantNamesInDMA[nameToCheck] == 1 ? 'True': 'False';
  console.info('isFound? '+isFound);
  return merchantNamesInDMA[nameToCheck] == 1;
}


/*
 * This function adjusts the UI appropriately for each merchant's preferred
 * loyalty authentication method.
 *  
 */
function updateLoyaltyFields(event){
  console.info('updateLoyaltyFields()');
  console.debug('which merchant: '+ retailerSelectBoxElement.value);
  console.log(myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel']);

  //oc: clear out inputs
  validationFieldsElement.innerHTML = '';

  //oc: determine if there are multiple accepted auth methods 
  if(myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel']['0']){
    console.log('We have array of authModels');
      
    //oc: create inputs
    var authenticationModelsArr = myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel'];
    for(var i = 0; i< authenticationModelsArr.length; i++){
        
      //oc: check if we need to add OR
      if(i > 0){
        console.log('this is not our first authModel, lets put tell user they can use the previous OR this one.');
        validationFieldsElement.appendChild(document.createTextNode('OR'));
      }//end if

      //oc: determine if there are multiple validation fields
      parseValidationFields(authenticationModelsArr[i]['QLoyaltyValidationFields'])
        
    }//end for

  }else{
    console.log('there is one auth method')
    parseValidationFields(myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel']['QLoyaltyValidationFields']);
  }//end else

};//end function updateLoyalty fields


function parseValidationFields(validationFields){
  console.info('parseValidationFields()');
  console.log(validationFields);
  if(validationFields['QLoyaltyValidationField']['0']){
    console.log('we have multiple fields in this model');
    for(var i = 0; i< validationFields['QLoyaltyValidationField'].length; i++){
        validationFieldsElement.appendChild(createValidationField(validationFields['QLoyaltyValidationField'][i]));
    }
  }else{
    console.log('we have only 1 field: '+validationFields['QLoyaltyValidationField']['name']);
    validationFieldsElement.appendChild(createValidationField(validationFields['QLoyaltyValidationField']));

  }//end else
}//end function

/*
 * This function creates a validation field
 * validationID is used to identify the type of the field. 
 * validationID can have the following values:
 *  •   1 (Loyalty Card)
 *  •   2 (Phone Number)
 *  •   3 (PIN)
 *  •   4 (Shopper ID)
 *  •   5 (Email ID)
 *  •   6 (Username)
 *  •   7 (Password)
 *
 */
function createValidationField(field){
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter '+ field['name'];
  input.dataset.validationId = field['validationID'];//oc: https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Using_data_attributes
  input.className = 'auth';
  return input;
}//end function

/*
 * This function loops through the loyalty fields and prepares 
 * the value object that will be passed to the coupon API via the component.
 * @return {array} loyaltyData - an array of properly formatted objects  
 */

function prepareLoyaltyData(){
  console.info('prepareLoyaltyData()');
  var loyaltyData = [];

  $('#validation_fields input').each(function(index){
    console.log('value: '+ this.value);
    if(this.value != ''){
      var loyaltyDataObj = {
        'mod:id': this.dataset.validationId,
        'mod:value': this.value
      };
      loyaltyData.push(loyaltyDataObj);  
    }//end if

  });
  return loyaltyData;
    
}//end function

/* 
 * This fuction handles the FETCH_DATA_COMPLETE event
 * dispatched by the coupon component.
 */
function onFetchData(){
  console.info('onFetchData');

  //oc: show happy green text
  $('#success').show();

  //oc: build offers
  offersSelectBoxElement.innerHTML = '';
  
  //oc: populate select box with current offers
  for (var i = 0; i < myCoupon.offers.length; i++) {
    var name = myCoupon.offers[i]['name'];
    var value = i;//oc: offerId to be retrieved by: myCoupon.offers[i]['offerId'];
    var opt = document.createElement('option'); // create new option element
    // oc: create text node to add to option element (opt)
    opt.appendChild(document.createTextNode(name));
    opt.value = value; // set value property of opt
    offersSelectBoxElement.appendChild(opt); // add opt to end of offersSelectBoxElement
  }//end for
  
  console.log("current offer: "+ offersSelectBoxElement.value);
  updateRetailerSelectBox();
}//end function

/* 
 * This fuction handles the click event
 * dispatched when a user clicks the submit button.
 */
function onAddLoyaltyClick(event){
  console.info('onAddLoyaltyClick()');

  merchantId = retailerSelectBoxElement.value;

  //oc: prepare loyaltyData[]
  var loyaltyData = prepareLoyaltyData();
  console.debug(loyaltyData);
  myCoupon.addLoyaltyInfo(loyaltyData, merchantId);
}//end function

function showDialogHandler(event){
  console.info('showDialogHandler');
  console.debug(event.detail);
  alert(event.detail.description);
}
   