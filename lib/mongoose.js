const { MongoClient } = require('mongodb');

const USERNAME = process.env.MONGOOSE_USER;
const PASSWORD = process.env.MONGOOSE_PASSWORD;
const DATABASE = process.env.MONGOOSE_DATABASE || 'gt';
const DB_URL = process.env.MONGOOSE_DB_URL;

const uri = `mongodb+srv://${USERNAME}:${PASSWORD}@${DB_URL}/${DATABASE}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const MONGO = {
    getRecords: async (query, _collection = 'daily') => {
        try {
            const collection = client.db(DATABASE).collection(_collection);
            const records = await collection.find(query).toArray();
            return records;
        } catch (err) {
            console.error('Error getting data from MongoDB:', err);
        }
    },
    createRecords: async (records, _collection = 'daily') => {
        try {
            const collection = client.db(DATABASE).collection(_collection);
            const result = await collection.insertMany(records);
            console.log('Data saved:', result.insertedCount);
        } catch (err) {
            console.error('Error saving data to MongoDB:', err);
        }
    }
};
module.exports = MONGO;
