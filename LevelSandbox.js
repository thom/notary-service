/* ===== Persist data with LevelDB ==================
|  Learn more: level: https://github.com/Level/level |
/===================================================*/

const level = require('level');
const chainDB = './chaindata';

class LevelSandbox {

  constructor() {
    this.db = level(chainDB);
  }

  // Get data from levelDB with key (Promise)
  async getLevelDBData(key) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.db.get(key, (err, value) => {
        if (err) reject(err);
        resolve(value);
      })
    });
  }

  // Get data from levelDB with hash (Promise)
  async getBlockByHash(hash) {
    let self = this;
    let block = null;
    return new Promise((resolve, reject) => {
      self.db.createReadStream()
        .on('data', function (data) {
          let currentBlock = JSON.parse(data.value);
          if(currentBlock.hash === hash) {
            block = data.value;
          }
        })
        .on('error', function (err) {
          reject(err)
        })
        .on('close', function () {
          if(block === null) {
            reject(new Error(`Block with hash '${hash}' not found`));
          }
          else {
            resolve(block);
          } 
        });
    });
  }

  // Get data from levelDB with wallet address (Promise)
  async getBlockByWalletAddress(address) {
    let self = this;
    let blocks = [];
    return new Promise((resolve, reject) => {
      self.db.createReadStream()
        .on('data', function (data) {
          let currentBlock = JSON.parse(data.value);
          if(currentBlock.body.address === address) {
            blocks.push(currentBlock);
          }
        })
        .on('error', function (err) {
          reject(err)
        })
        .on('close', function () {
          if(blocks.length === 0) {
            reject(new Error(`Block with address '${address}' not found`));
          }
          else {
            resolve(blocks);
          }
        });
    });
  }

  // Add data to levelDB with key and value (Promise)
  async addLevelDBData(key, value) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.db.put(key, value, (err) => {
        if (err) reject(err);
        resolve(value);
      })
    });
  }

  // Method that returns the height
  async getBlocksCount() {
    let self = this;
    let count = 0;
    return new Promise((resolve, reject) => {
      self.db.createReadStream()
        .on('data',   (data)  => count++)
        .on('error',  (err)   => reject(err))
        .on('close',  ()      => resolve(count))
        .on('end',    ()      => resolve(count));
    });
  }
}

module.exports.LevelSandbox = LevelSandbox;