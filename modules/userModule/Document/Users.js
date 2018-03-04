const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const usersSchema = new Schema({
    name: {type: String, unique: true},
    surname: String,
    password: String,
    // user_id: { type: Schema.Types.ObjectId, unique: true },
});

const Users = mongoose.model('users', usersSchema);

module.exports = Users;