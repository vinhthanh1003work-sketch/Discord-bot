const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data');


if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });

function getFilePath(name) {
  return path.join(DB_PATH, `${name}.json`);
}

function load(name) {
  const file = getFilePath(name);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function save(name, data) {
  fs.writeFileSync(getFilePath(name), JSON.stringify(data, null, 2), 'utf8');
}

function get(name, key) {
  return load(name)[key] ?? null;
}

function set(name, key, value) {
  const data = load(name);
  data[key] = value;
  save(name, data);
}

function del(name, key) {
  const data = load(name);
  delete data[key];
  save(name, data);
}

function getAll(name) {
  return load(name);
}

module.exports = { get, set, del, getAll, load, save };