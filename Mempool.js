/* ===== Mempool Class ============================
|  Class with a constructor for new mempool	      |
|  ===============================================*/

const BitcoinMessage = require('bitcoinjs-message');
const MempoolEntry = require('./MempoolEntry.js');
const TimeoutRequestsWindowTime = 5*60*1000;

class Mempool {

  /**
   * Constructor to create a new mempool
   */
  constructor(){
    this.mempool = {};
    this.timeoutRequests = {};
  }

  /**
   * Add request validation
   * 
   * @param {*} req 
   */
  addRequestValidation(req){
    let address = req.body.address;
    let mempoolEntry;

    // Check if address provided is already in the mempool
    if(this.mempool[address]) {
      mempoolEntry = this.mempool[address];
      let timeElapse = (new Date().getTime().toString().slice(0,-3)) - mempoolEntry.requestTimeStamp;
      let timeLeft = (TimeoutRequestsWindowTime/1000) - timeElapse;
      mempoolEntry.validationWindow = timeLeft;
    }
    else {
      mempoolEntry = new MempoolEntry.MempoolEntry(address);
      mempoolEntry.requestTimeStamp = new Date().getTime().toString().slice(0,-3);
      mempoolEntry.message = mempoolEntry.address + ":" + mempoolEntry.requestTimeStamp + ":starRegistry";
      mempoolEntry.validationWindow = TimeoutRequestsWindowTime / 1000;
      mempoolEntry.messageSignature = false;
      this.mempool[address] = mempoolEntry;
      this.timeoutRequests[address] = setTimeout(() => {
        this.removeValidationRequest(address);
      }, TimeoutRequestsWindowTime);
    }
    
    return mempoolEntry;
  }

  /**
   * Validate request
   * 
   * @param {*} req 
   */
  validateRequestByWallet(req) {
    let address = req.body.address;
    let signature = req.body.signature;
    let mempoolEntry;

    if(!this.mempool[address]) {
      mempoolEntry = new MempoolEntry.MempoolEntry(address);
      mempoolEntry.walletValidatedStatus = "Wallet address is not in mempool or has timed out, use /requestValidation to request validation";
      mempoolEntry.walletValidated = false;
      return mempoolEntry;
    }

    mempoolEntry = this.mempool[address];
    let message = address + ":" + mempoolEntry.requestTimeStamp + ":starRegistry";
    let verifyResult = BitcoinMessage.verify(message, address, signature);

    if(!verifyResult) {
      mempoolEntry.walletValidatedStatus = "Message verification failed"
      mempoolEntry.walletValidated = false;
      return mempoolEntry;
    }
    
    let timeElapse = (new Date().getTime().toString().slice(0,-3)) - mempoolEntry.requestTimeStamp;
    let timeLeft = (TimeoutRequestsWindowTime/1000) - timeElapse;
    mempoolEntry.validationWindow = timeLeft;
    mempoolEntry.walletValidated = true;
    mempoolEntry.walletValidatedStatus = "Message successfully verified"
    delete this.timeoutRequests[address];

    return mempoolEntry;
  }

  /**
   * Verify address request
   * 
   * @param {*} requestAddress 
   */
  verifyAddressRequest(address) {
    if(this.mempool[address])
      return true;
    else
      return false;
  }

  /**
   * Verify wallet validation request
   * 
   * @param {*} address 
   */
  verifyWalletValidationRequest(address) {
    if(this.mempool[address].walletValidated)
      return true;
    else
      return false;
  }

  /**
   * Helper method to remove validation requests
   * 
   * @param {*} address 
   */
  removeValidationRequest(address) {
    delete this.mempool[address];
    delete this.timeoutRequests[address];
  }
}

module.exports.Mempool = Mempool;