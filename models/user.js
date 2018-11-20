var MongoClient = require('mongodb').MongoClient;

var UserSchema = MongoClient.schema({
  userId:{type:String, maxlength:30, match: /^[A-Z].*/, require:true},
  password:{type:String, require:true}
});
var User = MongoClient.model('User',UserSchema);
module.exports = User;
