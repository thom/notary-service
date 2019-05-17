/* ===== Blockchain Class ==========================
|  Class with a constructor for new Blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelSandbox = require('./LevelSandbox.js');
const Block = require('./Block.js');

class Blockchain {

  constructor() {
    this.bd = new LevelSandbox.LevelSandbox();
    this.generateGenesisBlock();
  }

  // Auxiliary method to create a Genesis Block (always with height = 0)
  // You have two options, because the method will always execute when you create your Blockchain
  // you will need to set this up statically or instead you can verify if the height !== 0 then you
  // will not create the genesis block again
  async generateGenesisBlock() {
    if (await this.getBlockHeight() === -1) {
        const block = new Block.Block("First block in the chain - Genesis block");
        block.time = this._time();
        block.hash = this._hash(block);
        await this._addBlock(block);
    }
  }

  // Get block height, it is an auxiliary method that return the height of the Blockchain
  async getBlockHeight() {
    return await this.bd.getBlocksCount() - 1;
  }

  // Add new block
  async addBlock(block) {
    const height = await this.getBlockHeight();
    block.height = height + 1;
    block.time = await this._time();

    if (block.height > 0) { // as requested in the project specification, but not really necessary as it is always true
      const previousBlock = await this.getBlock(height);
      block.previousBlockHash = previousBlock.hash;
    }
    else { // as requested in the project specification, but not really necessary as it is never called
      await this.generateGenesisBlock();
    }

    block.hash = await this._hash(block);
    return await this._addBlock(block);
  }

  // Get block by height
  async getBlock(height) {
    return JSON.parse(await this.bd.getLevelDBData(height));
  }

  // Get block by hash
  async getBlockByHash(hash){
    return JSON.parse(await this.bd.getBlockByHash(hash));
  }
  
  // Get block by wallet address
  async getBlockByWalletAddress(address){
    return await this.bd.getBlockByWalletAddress(address);
  }

  // Validate if block is being tampered by block height
  async validateBlock(height) {
    const block = await this.getBlock(height);
    const blockHash = block.hash;
    block.hash = '';
    if (blockHash === this._hash(block))
      return true;
    else
      return false; //return new Error(`Block ${height} is not valid`);
  }

  // Validate blockchain
  async validateChain() {
    const height = await this.getBlockHeight()
    const errors = []
    
    for (let i = 0; i < height + 1; i++) {
      if (await this.validateBlock(i) === false)
        errors.push(`Block ${i} is not valid`);

      if (await this.validateLink(i) === false)
        errors.push(`Link from block ${i} to block ${i-1} is not valid`);
    }
    
    return Promise.all(errors).then(result => {
        return result;
    })
  }

  // Validate link
  async validateLink(height) {
    const block = await this.getBlock(height);

    // Genesis block
    if (height === 0) {
      if (block.previousBlockHash === '')
        return true;
      else
        return false;
    }
    // All other blocks
    else {
      const previousBlock = await this.getBlock(height - 1);
      if (block.previousBlockHash === previousBlock.hash)
        return true;
      else 
        return false; //new Error(`Link from block ${height} to block ${height - 1} is not valid`);
    }
  }

  // Utility method to tamper a block for test validation
  // This method is for testing purpose
  _modifyBlock(height, block) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.bd.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
        resolve(blockModified);
      }).catch((err) => { console.log(err); reject(err)});
    });
  }

  // Utility method to get the time
  _time() { 
    return new Date().getTime().toString().slice(0, -3);
  }

  // Utility method to get the hash
  _hash(block) { 
    return SHA256(JSON.stringify(block)).toString();
  }

  // Utility method to add block to the database
  async _addBlock(block) {
    return await this.bd.addLevelDBData(block.height, JSON.stringify(block));
  }
}

module.exports.Blockchain = Blockchain;