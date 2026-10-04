const mongoose = require('mongoose');

async function test() {
  const uris = [
    'mongodb://localhost:27017/proxyshield',
    'mongodb://admin:admin@localhost:27017/proxyshield?authSource=admin',
    'mongodb://root:root@localhost:27017/proxyshield?authSource=admin',
    'mongodb://admin:password@localhost:27017/proxyshield?authSource=admin',
    'mongodb://root:password@localhost:27017/proxyshield?authSource=admin',
  ];

  for (const uri of uris) {
    try {
      console.log('Trying:', uri);
      const conn = await mongoose.createConnection(uri).asPromise();
      const collections = await conn.db.listCollections().toArray();
      console.log('SUCCESS with URI:', uri);
      console.log('Collections:', collections.map(c => c.name));
      await conn.close();
      return;
    } catch (err) {
      console.log('Failed:', err.message);
    }
  }
}

test().then(() => process.exit(0));
