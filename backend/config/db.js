// Storage is now managed locally by storageService in data/temp/
// MongoDB is no longer required to run ProxyShield.
const connectDB = async () => {
  console.log('[Storage] ProxyShield is using local filesystem storage (MongoDB not required).');
};

module.exports = connectDB;
