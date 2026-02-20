import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://vipuljain675_db_user:ihGcTN3X577RGisM@cluster0.xpr7jsw.mongodb.net/finbank?retryWrites=true&w=majority";

if (!uri) throw new Error('Please add your Mongo URI to env or code');

let client = new MongoClient(uri);
let clientPromise = client.connect();

export default clientPromise;