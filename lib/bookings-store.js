const fs = require('fs');
const path = require('path');

const TABLE_NAME = process.env.BOOKINGS_TABLE_NAME || '';
const TABLE_REGION = process.env.DYNAMODB_REGION || 'ap-south-1';
const LOCAL_FILE = path.join(__dirname, '..', 'data', 'bookings.json');
const BOOKING_TTL_MS = 48 * 60 * 60 * 1000;

let dynamoClient = null;
let localCache = null;

function useDynamo() {
  return Boolean(TABLE_NAME);
}

function getDynamoClient() {
  if (!useDynamo()) return null;
  if (dynamoClient) return dynamoClient;

  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

  dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: TABLE_REGION }));
  return dynamoClient;
}

function ensureLocalDir() {
  const dir = path.dirname(LOCAL_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLocalBookings() {
  if (localCache) return localCache;
  ensureLocalDir();
  if (!fs.existsSync(LOCAL_FILE)) {
    localCache = {};
    return localCache;
  }
  try {
    localCache = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
  } catch (err) {
    localCache = {};
  }
  return localCache;
}

function writeLocalBookings(data) {
  ensureLocalDir();
  localCache = data;
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

function normalizeRecord(record) {
  if (!record) return null;
  return {
    payment_id: record.payment_id,
    session_key: record.session_key,
    status: record.status,
    created_at: record.created_at,
    expires_at: record.expires_at,
    completed_at: record.completed_at || null
  };
}

async function getBooking(paymentId) {
  if (!paymentId) return null;

  if (useDynamo()) {
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const result = await getDynamoClient().send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { payment_id: paymentId }
    }));
    return normalizeRecord(result.Item);
  }

  const bookings = readLocalBookings();
  return normalizeRecord(bookings[paymentId]);
}

async function saveBooking(paymentId, sessionKey, status) {
  const now = Date.now();
  const record = {
    payment_id: paymentId,
    session_key: sessionKey,
    status: status,
    created_at: now,
    expires_at: Math.floor((now + BOOKING_TTL_MS) / 1000)
  };

  if (useDynamo()) {
    const { PutCommand } = require('@aws-sdk/lib-dynamodb');
    await getDynamoClient().send(new PutCommand({
      TableName: TABLE_NAME,
      Item: record
    }));
    return normalizeRecord(record);
  }

  const bookings = readLocalBookings();
  bookings[paymentId] = record;
  writeLocalBookings(bookings);
  return normalizeRecord(record);
}

async function completeBooking(paymentId) {
  const existing = await getBooking(paymentId);
  if (!existing) return null;

  const record = {
    ...existing,
    status: 'completed',
    completed_at: Date.now()
  };

  if (useDynamo()) {
    const { PutCommand } = require('@aws-sdk/lib-dynamodb');
    await getDynamoClient().send(new PutCommand({
      TableName: TABLE_NAME,
      Item: record
    }));
    return normalizeRecord(record);
  }

  const bookings = readLocalBookings();
  bookings[paymentId] = record;
  writeLocalBookings(bookings);
  return normalizeRecord(record);
}

function isBookingActive(record) {
  if (!record) return false;
  if (record.status !== 'pending_booking') return false;
  if (record.expires_at && Date.now() > record.expires_at * 1000) return false;
  return true;
}

function storageMode() {
  return useDynamo() ? 'dynamodb' : 'local';
}

module.exports = {
  getBooking,
  saveBooking,
  completeBooking,
  isBookingActive,
  storageMode,
  BOOKING_TTL_MS
};
