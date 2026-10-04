const mongoose = require('mongoose');

async function test() {
  const users = ['admin', 'root', 'proxyshield', 'user', 'mongo', 'mongodb'];
  const pwds = ['admin', 'root', 'password', 'proxyshield', '123456', 'secret', 'admin123', 'root123', ''];
  const authSources = ['admin', 'proxyshield'];

  for (const user of users) {
    for (const pwd of pwds) {
      for (const authSource of authSources) {
        const authPart = pwd ? `${user}:${pwd}@` : `${user}@`;
        const uri = `mongodb://${authPart}localhost:27017/proxyshield?authSource=${authSource}`;
        try {
          const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 1000 }).asPromise();
          const collections = await conn.db.listCollections().toArray();
          console.log('\n========================================');
          console.log('SUCCESSFUL MONGO CONNECTION!');
          console.log('URI:', uri);
          console.log('Collections:', collections.map(c => c.name));
          console.log('========================================\n');
          await conn.close();
          return uri;
        } catch (err) {
          // ignore failures
        }
      }
    }
  }
  console.log('No matching credentials found in quick list.');
  return null;
}

test().then(() => process.exit(0));
