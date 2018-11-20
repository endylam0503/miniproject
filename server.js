var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var mongourl = 'mongodb://demo:demo1234@ds157503.mlab.com:57503/miniproject';
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var user_controller = require('./controllers/user');

app.set('view engine','ejs');
app.use(express.static('public'));


let db;
MongoClient.connect(mongourl,(err, database) => {
  assert.equal(err,null);
  console.log('Connected to MongoDB\n');
  db = database;
})
// parse incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/test', function(req,res){
  db.collection('test').findOne({}, function(err,result){
    if (err) throw err;
    console.log(result.name);
    res.render('list',{test:result.name});
  });
});

app.get('/',function(req,res){
  res.render('main');
});

/*
app.post('/', function(req, res){
  if (req.body.userId &&
    req.body.password)

    var userData = {
      userId:req.body.userId,
      password:req.body.password
    }

    User.create(userData, function(error, user){
      if(error) {
        return next(error);
      } else {
        return res.redirect('/')
      }
    });
})
*/
app.post('/', create)

function create(req, res){
  var users = {};
  if (req.body.userId &&
      req.body.password)
      users['userId'] = req.body.userId;
      users['password'] = req.body.password;
      console.log('About to insert: ' + JSON.stringify(users));
      insertUser(db,users,function(result){
        console.log(JSON.stringify(result));
        res.writeHead(200, {"Content-Type": "text/plain"});
  			res.write(JSON.stringify(users));
  			res.end("\ninsert was successful!");
      });
}
function insertUser(db,r,callback) {
	db.collection('users').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		callback(result);
	});
}









//app.get('*',function(req,res){
//  console.log('Route doesnt exist');
//  res.redirect('/')
//})



app.listen(process.env.PORT || 8099);
