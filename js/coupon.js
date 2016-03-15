/*
* @author Owen Corso 
*  q
* Syntax taken from Ebidelman's article: 
* http://www.html5rocks.com/en/tutorials/webcomponents/customelements/
* and
* @MattAntWest's article:
* http://blog.teamtreehouse.com/create-custom-html-elements-2
* 
*/


/*
* oc: Need a polyfill for IE to accept custom events in IE.
* 
* Custom Events: 
* https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
* 
* Polyfill for IE found here:
* http://stackoverflow.com/questions/26596123/internet-explorer-9-10-11-event-constructor-doesnt-work
*/
(function () {
  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();


var proto = Object.create(HTMLElement.prototype);

/* 
 * Standard Web Component Callback fired when the element is instantiated.
 */
proto.createdCallback = function() {
  console.info('createdCallback');
  this.merchantsAndOffers = null;
  this.url = this.getAttribute('data-url');//'https://devapi.cellfire.com/services/QBridgeServiceV2'; //url: 'http://api.cellfire.com/services/QBridgeServiceV2',
  this.autoLoad = this.hasAttribute('data-auto-load') ? true : false;
  this.apiType = this.getAttribute('data-api-type');
  this.apiKey = this.getAttribute('data-api-key');//'y7zkry6e68dddhk6wmpwh5yv' 
  this.apiTlc = this.getAttribute('data-api-tlc');//'UNT25cU4aYnVtdE1RODQ1NGtBc01n#bum';
  this.offers = [];
  this.retailers = null;
  this.imgPrefix = null; //http://devimages.cellfire.com/<folder>/<id>_<size>.png size can be 300
  this.version = null;
  this.partnerId = 'PG_GDN_Lightbox';
  this.referenceId = Math.round(Math.random() * new Date().getTime());//oc: this is unique for each session 
  this.envAttributes = {
    'xmlns:com': 'com.cellfire.webservice.QBridgeServiceV2',
    'xmlns:mod': 'http://model.qbridge.webservice.cellfire.com'
  };

  //oc: offer specific variables
  this.currentRetailer = null;
  this.isCurrentRetailerAdded = false;
  this.currentLoyaltyData = null;
  this.currentOfferId = null;
  this.currentCouponId = null;

};

/* 
 * Standard Web Component Callback fired when the element is added to the DOM.
 */
proto.attachedCallback = function() {
  console.info('attachedCallback');
  if(this.autoLoad) this.fetchData();
};

/*
* This function requests the offers and retailers from Cellfire API
*/
proto.fetchData = function() {
  console.info('fetchData');

  //oc: make the soap call.
  $.soap({
    url: this.url,
    method: 'com:getMerchantsAndOffers',
    HTTPHeaders: {
      'Api-Key': this.apiKey,
      'tlc': this.apiTlc
    },
    data: {},
    envAttributes: this.envAttributes,
    appendMethodToURL: false, // method name will be appended to URL defaults to true
    soap12: false,
    success: this._onFetchData.bind(this),
    error: function(SOAPResponse) {
      //oc show error
      console.error('fetchData fail: ', SOAPResponse);
    }
  });
} //end function fetchData

/* 
* This function handles the response from getMerchantsAndOffers
* by storing the info we'll need later in variables
*/
proto._onFetchData = function(soapResponse){
  console.info('_onFetchData');

  //oc: drill down to find the response data
  response = soapResponse.toJSON();
  console.log(response['Body']['getMerchantsAndOffersResponse']['out']);
  var data = response['Body']['getMerchantsAndOffersResponse']['out'];

  //oc: save data
  this.imgPrefix = data['imageUrl'].replace('http://','https://');//oc: switch to https
  console.log(this.imgPrefix);
  this.offers = data['offers']['QOffer'];
  this.version = data['version']['text'];

  this.retailers = [];

  //oc: store retailers by for retrieval by Id @ Big O(1)
  for (var i = 0; i < data['retailers']['QRetailer'].length; i++) {
    var key = data['retailers']['QRetailer'][i]['merchantId'];
    var value = data['retailers']['QRetailer'][i];
    this.retailers[key] = value;
  } //end for

  //oc: tell parent
  var myEvent = new CustomEvent('FETCH_DATA_COMPLETE');
  this.dispatchEvent(myEvent);

}//end function

/* 
 * This function validates the user's loyalty info
 * @param String referenceId, 
 * @param String partnerId, 
 * @param LoyaltyData[] 
 * @param loyaltyData, 
 * @param Int merchantId
 * @return Int
 *    0  : successful association
 *    -1 : Invalid loyalty info
 *    -2 : Loyalty account has been added to a different merchant
 *    -3 : [blank] 
 */
proto.addLoyaltyInfo = function(loyaltyArr, merchantId){
  console.info('addLoyaltyInfo()');
  
  if(this.isSameUser(loyaltyArr, merchantId)){
    //oc: skip directly to requesting current active coupons.
    console.debug('already added loyalty, skip to getActiveCoupons');
    this.getActiveCoupons(this.currentRetailer);
  }else{
    //oc: store current merchant Id for later
    this.isCurrentRetailerAdded = false;
    this.currentRetailer = merchantId;
    this.currentLoyaltyData = loyaltyArr;

    //oc: regenerate reference ID in case this is a different card #
    this.referenceId = Math.round(Math.random() * new Date().getTime());

    //oc: prepare data for SOAP request
    var data = {};
        data['com:in0'] = this.referenceId;
        data['com:in1'] = this.partnerId;
        data['com:in2'] = {};
        data['com:in2']['mod:LoyaltyData'] = loyaltyArr;
        data['com:in3'] = merchantId;
      
    //oc: make the soap request.
    $.soap({
      url: this.url,
      method: 'com:addLoyaltyInfo',
      HTTPHeaders: { 
        'Api-Key': this.apiKey,
        'tlc': this.apiTlc
      },
      data: data,
      appendMethodToURL: false, // method name will be appended to URL defaults to true
      soap12: false,
      envAttributes: this.envAttributes,
      success: this._onAddLoyaltyInfo.bind(this),//make sure this is the right this 
      error: function(SOAPResponse) {
        //oc show error
        console.error('_onSOAPResponse fail: ', SOAPResponse);
      }
    });
    
  }

}//end function addLoyaltyInfo

/*
 * This function checks to see if the user submitting is the same 
 * user that successfully submitted previously
 * @param {array} loyaltyDataToCheck - this is the new loyalty info
 * @param {string} merchantId - this is the current merchant
 * @return {boolean} isSameUser - the result of same both loyalty AND merchant
 */
proto.isSameUser = function(loyaltyDataToCheck, merchantId){
  console.log('isSameUser()');

  var isSameLoyaltyAcc = false;
  var isSameRetailer = false;
  
  //oc: is same retailer?
  if(merchantId == this.currentRetailer && 
      this.isCurrentRetailerAdded)
    isSameRetailer = true;
  else return false;
  
  //oc: we've successfully clipped something but 
  //    is this data same loyalty data as before?
  for(var i = 0; i< loyaltyDataToCheck.length; i++){
    if( loyaltyDataToCheck[i]['mod:id'] == this.currentLoyaltyData[i]['mod:id'] &&
        loyaltyDataToCheck[i]['mod:value'] == this.currentLoyaltyData[i]['mod:value'])
      isSameLoyaltyAcc = true;
    else return false;
  }

  return isSameRetailer && isSameLoyaltyAcc;
}//end function

/*
 * This function handles the response to addLoyaltyInfo
 * If the loyalty card was successfully added to service, getActiveCoupons is automatically called
 * If unsuccessful and a dialog needs to be shown to the user, an event is dispatched
 * 
 * Status Code key for action : addLoyaltyInfo
 * 0  - Successfully attached loyalty:: no event dispatched
 * -1 - Invalid Loyalty info.
 * -2 - Loyalty account has been added to a different merchant.
 * -3 - General server error.
 * -4 - Unknown response code when adding your loyalty account.
 */
proto._onAddLoyaltyInfo = function(data){
  console.info('_onAddLoyaltyInfo');
  var response = data.toJSON();
  var addLoyaltyResult = response['Body']['addLoyaltyInfoResponse']['out'];
  console.log('addLoyaltyInfo result: '+ addLoyaltyResult);


  switch(addLoyaltyResult){
    case '0' : console.log('Loyalty Successfully attached!');
      this.isCurrentRetailerAdded = true;
      //oc: immediately getActiveCoupons
      this.getActiveCoupons(this.currentRetailer);
      break; 
    case '-1' : console.warn('Invalid loyalty info'); 
      //oc: dispatch event to inform parent of the problem
      var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
          'statusCode': '-1',
          'action':'addLoyaltyInfo', 
          'headline': 'Sorry', 
          'description':'Invalid loyalty info.'
        }});
      this.dispatchEvent(showDialogEvent);
      break;
    case '-2' : console.warn('Loyalty account has been added to a different merchant.');
      //oc: dispatch event to inform parent of the problem
      var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
          'statusCode': '-2',
          'action':'addLoyaltyInfo', 
          'headline': 'Sorry', 
          'description':'Your loyalty account has been added to a different merchant.'
        }});
      this.dispatchEvent(showDialogEvent);
      break;
    case '-3' : console.warn('General server error');
      //oc: dispatch event to inform parent of the problem
      var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
          'statusCode': '-3',
          'action':'addLoyaltyInfo', 
          'headline': 'Sorry', 
          'description':'There was an error adding your loyalty account.'
        }});
      this.dispatchEvent(showDialogEvent);
      break;
    default: console.error('Unknown loyalty response code');
      //oc: dispatch event to inform parent of the problem
      var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
          'statusCode': '-4',
          'action':'addLoyaltyInfo', 
          'headline': 'Sorry', 
          'description':'There was an unknown response code when adding your loyalty account.'
        }});
      this.dispatchEvent(showDialogEvent);

  }//end switch

}//end function _onAddLoyaltyInfo

/*
 * This function asks the Cellfire API for the active coupons
 * for a given retailer. Active coupon retrieval prevents users 
 * from attempting to clip an old or previously clipped coupon.
 *
 * API function name : getActiveCouponsByRetailer
 * @param String referenceID - Reference ID from partner
 * @param String partnerID - Partner name and OS platform
 * @param Int merchantId
 * @return Object[] QCouponLite : Array of coupon objects 
*/
proto.getActiveCoupons = function(merchantId){
  console.info('getActiveCoupons: '+ merchantId);
  //oc: getActiveCouponsByRetailer

  //oc: prepare parameters
  var data = {};
      data['com:in0'] = this.referenceId;
      data['com:in1'] = this.partnerId;
      data['com:in2'] = merchantId || this.currentRetailer;
    
  //oc: make the soap call.
  $.soap({
    url: this.url,
    method: 'com:getActiveCouponsByRetailer',
    HTTPHeaders: { 
      'Api-Key': this.apiKey,
      'tlc': this.apiTlc
    },
    data: data,
    appendMethodToURL: false, // method name will be appended to URL defaults to true
    soap12: false,
    envAttributes: this.envAttributes,
    success: this._onGetActiveCoupons.bind(this),
    error: function(SOAPResponse) {
      //oc show error
      console.error('_onSOAPResponse fail: ', SOAPResponse);
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '-1', //oc: generic unknown error
            'action':'getActiveCoupons', 
            'headline': 'IO Error.', 
            'description':'Failed to load results.'
          }});
        this.dispatchEvent(showDialogEvent);
    }
  });

}//end function getActiveCoupons

/*
 * This function handles the getActiveCouponsByRetailer response
 * The purpose of this is to ensure users are successfully attached to a 
 * retailer's loyalty account before attempting to clip a coupon
 * 
 *  Status Code key for action : getActiveCouponsByRetailer
 *    1 - No active coupons were returned for this retailer. You may have already clipped all possible coupons.
 *    2 - This offer was not found in the active coupons list and may have already been clipped to your loyalty account.
 */
proto._onGetActiveCoupons = function(soapResponse){
  console.info('_onGetActiveCoupons');
  
  //oc: drill down to get active coupon list.
  var response = soapResponse.toJSON();
  var getActiveCouponsResult = response['Body']['getActiveCouponsByRetailerResponse']['out'];
  console.log(getActiveCouponsResult);
  var activeCoupons = getActiveCouponsResult['QCouponLite'];

  //oc: search for currentOfferId in the coupon array
  var isFound = false;
  console.debug('current offerId: '+this.currentOfferId);
  if(getActiveCouponsResult == ''){
    console.warn('Response is EMPTY!!');
    var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', 
      { 'detail':{
        'statusCode': '1',
        'action':'getActiveCouponsByRetailer', 
        'headline': 'Sorry', 
        'description':'No active coupons were returned for this retailer. You may have already clipped all possible coupons.'
      }});
    this.dispatchEvent(showDialogEvent);
    
  }else {

    if (activeCoupons[0]){
      //oc: multiple active coupons
      for(var i=0; i<activeCoupons.length; i++){
        console.debug('looping coupon array');
        var c = activeCoupons[i];
        if (this.currentOfferId == c['offerId']){
          isFound = true;
          console.log('coupon Id to clip: '+c['couponId']);
          this.currentCouponId = c['couponId'];
          break;
        }//end if
      }//end for
      
    } else{
      //oc: only 1 active coupon, access directly
      console.log(activeCoupons);
      if (this.currentOfferId == activeCoupons['offerId']){
        isFound = true;
        console.log('coupon Id to clip: '+activeCoupons['couponId']);
        this.currentCouponId = activeCoupons['couponId'];
      }//end if
    }//end else

    //oc: dispatch if we matched an active coupon.
    if(isFound) {
      this.clipCoupon(this.currentCouponId, this.referenceId, this.partnerId, this.version);
    } else {
      console.warn('offer Id you are trying to clip was not found in active coupons list, you may have already clipped this. show dialog');
        //oc: dispatch event to inform parent of the problem
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '2', 
            'action':'getActiveCouponsByRetailer', 
            'headline': 'Sorry', 
            'description':'This offer was not found in the active coupons list and may have already been clipped to your loyalty account.'
          }});
        this.dispatchEvent(showDialogEvent);
    }
  }//end else

}//end function _onGetActiveCoupons

  /*
    * This function performs a coupon clipping.
    * @param couponId - Integer[]
    * @param referenceId - String, Identifier generated by the Partner to represent a single user on the Partner’s system
    * @param PartnerID – Identifier generated by the Partner to represent the company and platform during QBridge communication
    * @param version - long
  */
  proto.clipCoupon = function(couponId, referenceId, partnerId, version) {
    console.info('clipCoupon: ' + couponId);

    var couponObj = {'com:int': couponId.toString()};
    var couponItem = [couponObj];
    $.soap({
      url: this.url,
      method: 'clipCoupon',
      HTTPHeaders: { // additional http headers send with the $.ajax call, will be given to $.ajax({ headers: })
        'Api-Key': this.apiKey,
        'tlc': this.apiTlc
      },
      data: {
        'com:in0': couponItem,//couponId from getActiveCouponsByRetailer
        'com:in1': referenceId, //referenceId
        'com:in2': partnerId, //PartnerId
        'com:in3': version
      },
      envAttributes: this.envAttributes,
      appendMethodToURL: false, // method name will be appended to URL defaults to true
      soap12: false,
      success: this._onClipCoupon.bind(this),
      error: function(SOAPResponse) {
        // show error
        console.error('soap fail: ', SOAPResponse);
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '-1', //oc: generic unknown error
            'action':'clipCoupon', 
            'headline': 'IO Error.', 
            'description':'Failed to load results.'
          }});
        this.dispatchEvent(showDialogEvent);
      }
    });

  } //end function clipCoupon

  /*
   * This function handles the clipCoupon response by dispatching the corresponding statusCode to the parent.
   * @param soapResponse - Object, the coupon API response object.
   *
   * Status Code key for action : clipCoupon
   *    0  - This offer was successfully clipped to your loyalty account.
   *   -1  - An unknown error has occurred.
   *   -7  - The clip failed. Please try again later.
   *   -8  - Loyalty account not found.
   *   -10 - This offer was already clipped.
   */
  proto._onClipCoupon = function (soapResponse){
    console.log('clipCoupon complete');
    response = soapResponse.toJSON();
    var data = response['Body']['clipCouponResponse']['out'];
    console.log(data);

    var statusCode = data['QClipResponse']['statusCode']['text'];

    switch (statusCode){
      case '0' : 
        console.log('coupon '+ this.currentCouponId + ' was successfully clipped');
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '0', 
            'action':'clipCoupon', 
            'headline': 'Success.', 
            'description':'This offer was successfully clipped to your loyalty account.'
          }});
        this.dispatchEvent(showDialogEvent);
        break;
      case '-7': 
        console.warn('coupon ' + this.currentCouponId + ' failed to clip to the loyalty account');
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '-7', 
            'action':'clipCoupon', 
            'headline': 'Sorry.', 
            'description':'The clip failed. Please try again later.'
          }});
        this.dispatchEvent(showDialogEvent);
        break;
      case '-8': 
        console.warn('loyalty account not found');
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '-8', 
            'action':'clipCoupon', 
            'headline': 'Loyalty account not found.', 
            'description':'Please check your loyalty account info and try again.'
          }});
        this.dispatchEvent(showDialogEvent);
        break;
      case '-10': 
        console.warn('coupon ' + this.currentCouponId + ' was already clipped!');
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '-10', 
            'action':'clipCoupon', 
            'headline': 'Sorry.', 
            'description':'This offer was already clipped.'
          }});
        this.dispatchEvent(showDialogEvent);
        break;
      default : console.error('unknown/unhandled clipCoupon statusCode');
        //oc: dispatch event to inform parent of the result
        var showDialogEvent = new CustomEvent('MESSAGE_RECEIVED', {'detail':{
            'statusCode': '-1', //oc: generic unknown error
            'action':'clipCoupon', 
            'headline': 'Sorry.', 
            'description':'An unknown error has occurred.'
          }});
        this.dispatchEvent(showDialogEvent);
    }//end switch

  }//end function _onClipCoupon

//oc: initialize coupon as a custom element in the DOM
var coupon = document.registerElement('ored-coupon', {prototype: proto});