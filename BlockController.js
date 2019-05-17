/* ===== BlockController Class ======================
|  Class with a constructor for new BlockController	|
|  =================================================*/

const SHA256 = require('crypto-js/sha256');
const Blockchain = require('./Blockchain.js');
const Block = require('./Block.js');
const Mempool = require('./Mempool.js');
const MempoolEntry = require('./MempoolEntry.js');
const Hex2ascii = require('hex2ascii');
const TimeoutRequestsWindowTime = 5*60*1000;

/**
 * Controller Definition to encapsulate routes to work with blocks
 */
class BlockController {

  /**
   * Constructor to create a new BlockController, you need to initialize here all your endpoints
   * 
   * @param {*} app
   */
  constructor(app) {
    this.app = app;
    this.blocks = [];
    this.blockchain = new Blockchain.Blockchain();
    this.mempool = new Mempool.Mempool();
    this.getHomepage();
    this.postRequestValidation();
    this.postValidate();
    this.postBlock();
    this.getBlockByHash();
    this.getBlockByWalletAddress();
    this.getBlockByHeight();
  }

  /**
   * Implement a GET endpoint for the homepage, url: "/"
   */
  getHomepage() {
    this.app.get("/", (req, res) => {
      res.send('Welcome to the star notary!');
      res.end();
    });
  }

  /**
   * Web API POST endpoint to validate request with JSON response, url: "/requestValidation"
   */
  postRequestValidation() {
    this.app.post("/requestValidation", (req, res) => {
      try {
        let mempoolEntry = this.mempool.addRequestValidation(req);
        res.status(200).json({
          "walletAddress" : mempoolEntry.address,
          "requestTimeStamp" : mempoolEntry.requestTimeStamp,
          "message" : mempoolEntry.message,
          "validationWindow" : mempoolEntry.validationWindow
        });
      }
      catch(err) {
        console.log(`Bad request: ${err}`);
        res.status(400).send(`Bad request: ${err}`);
      }
      res.end();
    });
  }

  /**
   * Web API POST endpoint validates message signature with JSON response, url: "/message-signature/validate"
   */
  postValidate() {
    this.app.post("/message-signature/validate", (req, res) => {
      try {
        let mempoolEntry = this.mempool.validateRequestByWallet(req);
        if (mempoolEntry.walletValidated === true) {
          res.status(200).json({
            "registerStar" : mempoolEntry.walletValidated,
            "status" : {
              "address" : mempoolEntry.address,
              "requestTimeStamp" : mempoolEntry.requestTimeStamp,
              "message" : mempoolEntry.message,
              "validationWindow" : mempoolEntry.validationWindow,
              "messageSignature" : mempoolEntry.walletValidated
            }
          });
        }
        else {
          console.log(`Bad request: ${mempoolEntry.walletValidatedStatus}`);
          res.status(400).send(`Bad request: ${mempoolEntry.walletValidatedStatus}`);         
        }
      }
      catch(err) {
        console.log(`Bad request: ${err}`);
        res.status(400).send(`Bad request: ${err}`);
      }
      res.end();
    });
  }

  /**
   * Web API POST endpoint with JSON response that submits the star information to be saved in the blockchain, url: "/block"
   */
  postBlock() {
    this.app.post("/block", async (req, res) => { 
      try {
        let address = req.body.address;

        // Check if address is already in the mempool
        if(!this.mempool.verifyAddressRequest(address)) {
          let errorMessage = "Wallet address is not in mempool or has timed out, use /requestValidation to request validation"
          console.log(errorMessage);
          res.status(400).send(errorMessage);
          res.end();
          return;
        }

        // Check if address is validated with the bitcoin wallet
        if(!this.mempool.verifyWalletValidationRequest(address)) {
          let errorMessage = "Wallet address has not been validated with the bitcoin wallet, use /message-signature/validate to request validation"
          console.log(errorMessage);
          res.status(400).send(errorMessage);
          res.end();
          return;
        }

        let star = req.body.star;
        if(!star["dec"] || !star["ra"] || !star["story"]) {
          let errorMessage = "dec, ra and story are mandatory"
          console.log(errorMessage);
          res.status(400).send(errorMessage);
          res.end();
          return;
        }

        let story = star.story;
        let storyBuffer = Buffer.from(story, "utf8");
        let hexEncodedStory = storyBuffer.toString("hex");
        let body = {
          "address" : address,
          "star" : {
            "ra" : star["ra"],
            "dec" : star["dec"],
            "mag" : star["mag"],
            "cen" : star["cen"],
            "story" : hexEncodedStory
          }
        }

        let newBlock = new Block.Block(body);
        newBlock = await this.blockchain.addBlock(newBlock);
        this.mempool.removeValidationRequest(address);
        res.json(newBlock);
      }
      catch(err) {
        let errorMessage = `Cannot add block to the chain: ${err}`;
        console.log(errorMessage);
        res.status(400).send(errorMessage);
      }
      res.end();
    });
  }

  /**
   * Get Star block by hash with JSON response, url: "/stars/hash:[HASH]"
   */
  getBlockByHash() {
    this.app.get("/stars/hash:hash", async (req, res) => {
      try {
        let hash = req.params.hash.slice(1);

        //console.log(`Trying to get block with hash value ${hash}`);
        let result = await this.blockchain.getBlockByHash(hash)
        try {
          result.body.star.storyDecoded = Hex2ascii(result.body.star.story);
        }
        catch(err) {
          console.log(`Block ${hash} is not a star`);
        }
        res.send(result);
      }
      catch(err) {
        console.log(`Bad request: ${err}`);
        res.status(400).send(`Bad request: ${err}`);
      }
      res.end();
    });
  }

  /**
   * Get Star block by wallet address (blockchain identity) with JSON response, url: "/stars/address:[ADDRESS]"
   */
  getBlockByWalletAddress() {
    this.app.get("/stars/address:address", async (req, res) => {
      //console.log(`Trying to get blocks with wallet address ${address}`);
      try {
        let address = req.params.address.slice(1);
        let result = await this.blockchain.getBlockByWalletAddress(address);
        for(let i in result) {
          result[i].body.star.storyDecoded = Hex2ascii(result[i].body.star.story);
        }
        res.send(result);
      }
      catch(err) {
        console.log(`Bad request: ${err}`);
        res.status(400).send(`Bad request: ${err}`);
      }
      res.end();
    });
  }

  /**
   * Get star block by star block height with JSON response, url: "/block/[HEIGHT]"
   */
  getBlockByHeight() {
    this.app.get("/block/:height", async (req, res) => {
      try {
        let height = req.params.height;
        //console.log(`Trying to get block with index ${height}`);
        let result = await this.blockchain.getBlock(height);
        try {
          result.body.star.storyDecoded = Hex2ascii(result.body.star.story);
        }
        catch(err) {
          console.log(`Block ${height} is not a star`);
        }
        res.send(result);
      }
      catch(err) {
        console.log(`Bad request: ${err}`);
        res.status(400).send(`Bad request: ${err}`);
      }
      res.end();
    });
  }
}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}