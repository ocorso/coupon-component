/*
* Syntax taken from Ebidelman's article: 
* http://www.html5rocks.com/en/tutorials/webcomponents/customelements/
* and
* @MattAntWest's article:
* http://blog.teamtreehouse.com/create-custom-html-elements-2
*/
var proto = Object.create(HTMLElement.prototype);

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
  this.referenceId = Math.round(Math.random() * new Date().getTime());
  this.envAttributes = {
    'xmlns:com': 'com.cellfire.webservice.QBridgeServiceV2',
    'xmlns:mod': 'http://model.qbridge.webservice.cellfire.com'
  };

  //oc: offer specific variables
  this.currentRetailer = null;
  this.currentOfferId = null;
  this.currentCouponId = null;

};
proto.attachedCallback = function() {
  console.info('attachedCallback');
  if(this.autoLoad) this.fetchData();
};

/*
* This function requests the offers and retailers from API
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
      console.error('_onSOAPResponse fail: ', SOAPResponse);
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
  console.log(response['#document']['soap:Envelope']['soap:Body']['ns1:getMerchantsAndOffersResponse']['ns1:out']);
  var data = response['#document']['soap:Envelope']['soap:Body']['ns1:getMerchantsAndOffersResponse']['ns1:out'];

  //oc: save data
  this.imgPrefix = data['imageUrl']['_'];
  this.offers = data['offers']['QOffer'];
  this.version = data['version']['_'];

  this.retailers = [];

  //oc: store retailers by for retrieval by Id
  for (var i = 0; i < data['retailers']['QRetailer'].length; i++) {
    var key = data['retailers']['QRetailer'][i]['merchantId'];
    var value = data['retailers']['QRetailer'][i];
    this.retailers[key] = value;
  } //end for

  //oc: tell parent
  var event = new Event('FETCH_DATA_COMPLETE');
  this.dispatchEvent(event);

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
  
  //oc: store current merchant Id for later
  this.currentRetailer = merchantId;

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

}//end function addLoyaltyInfo

/*
 * This function handles the response to addLoyaltyInfo
 * If the loyalty card was successfully added to service, getActiveCoupons is automatically called
 * If unsuccessful and a dialog needs to be shown to the user, an event is dispatched
 */
proto._onAddLoyaltyInfo = function(data){
  console.info('_onAddLoyaltyInfo');
  var response = data.toJSON();
  var addLoyaltyResult = response['#document']['soap:Envelope']['soap:Body']['ns1:addLoyaltyInfoResponse']['ns1:out'];
  console.log('addLoyaltyInfo result: '+ addLoyaltyResult);

  switch(addLoyaltyResult){
    case '0' : console.log('Loyalty Successfully attached!');
      this.getActiveCoupons(this.currentRetailer);
      break; 
    case '-1' : console.warning('Invalid loyalty info'); break;
    case '-2' : console.warning('Loyalty account has been added to a different merchant'); break;
    case '-3' : console.warning('General server error'); break;
    default: console.error('Unknown loyalty response code');
  }

}//end function
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
  console.info('getActiveCoupons');
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
    }
  });

}//end function getActiveCoupons

/*
 * This function handles the getActiveCouponsByRetailer response
 * The purpose of this is to ensure users are successfully attached to a 
 * retailer's loyalty account before attempting to clip a coupon
 */
proto._onGetActiveCoupons = function(soapResponse){
    console.info('_onGetActiveCoupons');
  var response = soapResponse.toJSON();
  var getActiveCouponsResult = response['#document']['soap:Envelope']['soap:Body']['ns1:getActiveCouponsByRetailerResponse']['ns1:out'];
  console.log(getActiveCouponsResult);
  var couponArr = getActiveCouponsResult['ns2:QCouponLite'];

  //oc: search for currentOfferId in the coupon array
  var isFound = false;
  console.debug('current offerId: '+this.currentOfferId);
  for(var c of couponArr){
    if (this.currentOfferId == c['offerId']['_']){
      isFound = true;
      console.log('coupon Id to clip: '+c['couponId']['_']);
      this.currentCouponId = c['couponId']['_'];
      break;
    }//end if
  }//end for

  if(isFound) {
    this.clipCoupon(this.currentCouponId, this.referenceId, this.partnerId, this.version);
  } else console.warn('offer Id you are trying to clip was not found in active coupons list, you may have already clipped this. show dialog');
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

    $.soap({
      url: this.url,
      method: 'clipCoupon',
      HTTPHeaders: { // additional http headers send with the $.ajax call, will be given to $.ajax({ headers: })
        'Api-Key': this.apiKey,
        'tlc': this.apiTlc
      },
      data: {
        'com:in0': [{'com:int':couponId}],//couponId from getActiveCouponsByRetailer
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
      }
    });

  } //end function clipCoupon

  proto._onClipCoupon = function (soapResponse){
    console.log('clipCoupon complete');
    response = soapResponse.toJSON();
    var data = response['#document']['soap:Envelope']['soap:Body']['ns1:clipCouponResponse']['ns1:out'];
    console.log(data);

    var statusCode = data['ns2:QClipResponse']['statusCode']['_'];

    switch (statusCode){
      case '0' : 
        console.log('coupon '+ this.currentCouponId + ' was successfully clipped');
        break;
      case '-10': 
        console.warn('coupon ' + this.currentCouponId + ' was already clipped!');
        break;
      default : console.error('unknown/unhandled clipCoupon statusCode');

    }//end switch

  }//end function _onClipCoupon

//oc: initialize coupon as a custom element in the DOM
var coupon = document.registerElement('ored-coupon', {prototype: proto});