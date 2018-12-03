var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var mongourl = 'mongodb://demo:demo1234@ds157503.mlab.com:57503/miniproject';
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var user_controller = require('./controllers/user');
var ObjectID = require('mongodb').ObjectID;
const apiUrl = '/api';
var fileUpload = require('express-fileupload');

global.rootPath = __dirname

global.userSet = new Set()
app.use(session({
  name: 'session',
  keys: ['endy', 'handsome'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

app.use(fileUpload());

app.set('view engine','ejs');
app.use(express.static('public'));

let db;
MongoClient.connect(mongourl,(err, database) => {
  assert.equal(err,null);
  console.log('Connected to MongoDB\n');
  db = database;
  global.user = db.collection('users')
  global.rt = db.collection('restaurants')
})
// parse incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/',function(req,res){
  res.render('main');
});

// register
app.post('/register', createUser) // register

function createUser(req, res){
  var users = {};
  if (req.body.userId &&
      req.body.password)
      users['userId'] = req.body.userId;
      users['password'] = req.body.password;
      global.user.find({
        userId:users['userId']
      }).toArray(function(err, exist){
        console.log(exist);
        try{
        if (users['userId'] == 'Visitor') throw ('You can not register as Visitor!')
        if (exist.length > 0) throw ('User ID was taken')
        console.log('About to insert: ' + JSON.stringify(users));
        insertUser(db,users,function(result){
          console.log(JSON.stringify(result));
          res.send('<script>alert("Register Success");window.history.back()</script>')

          });
      } catch (err) {
    res.send(alertMsg('Fail to register - ' + err))
    }
  });
}

function insertUser(db,r,callback) {
	global.user.insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		callback(result);
	});
}
// login
app.post('/login',login) // login

function login(req, res){
  let userId = req.body.userId
  let password = req.body.password
  global.user.find({
    userId:userId
  }).toArray(function (err, loginResult){
    console.log(loginResult);
    try {
      if (loginResult.length <= 0) throw ('user not found')
      if (loginResult[0].password != password) throw ('incorrect password')
      req.session.userId = userId;
      global.userSet.add(userId);
      console.log('session saved Successfully!' + req.session.userId);
      res.redirect('/read')
    } catch(err){
      res.send(alertMsg('Fail to login - ' + err))
    }
  })
}
// Create new Restaurant
app.get('/new',function(req,res,next){
  res.render('new');
});

app.post('/new', createRest)

function createRest(req, res){
  if (!req.session.userId){
    id = 'Visitor'
  }else{
    id = req.session.userId
  }
var photo = "";
if ( req.files.rtPhoto.mimetype.includes("/image")) {
   photo = getPhoto(req, res)
} else {
  photo = "";
}

  var rest = {
    restaurant_id : req.body.restaurant_id,
    name : req.body.name,
    borough : req.body.borough,
    cuisine : req.body.cuisine,
    photo : photo,
    address : {
      street : req.body.street,
      building : req.body.building,
      zipcode : req.body.zipcode,
      coord : {
        latitude : req.body.latitude,
        longtitude : req.body.longtitude,
      }
    },
    grade : [

    ],
    owner : id
  }
  global.rt.find({
    restaurant_id:rest['restaurant_id']
  }).toArray(function(err, exist){
    try{
      if (exist.length > 0) throw ('Restaurant ID was taken')
      console.log('Creating Restaurant' + JSON.stringify(rest));
      insertRest(db,rest,function(result){
        console.log(JSON.stringify(result));
        res.redirect('/read');

      })
    } catch (err) {
      res.send(alertMsg('Fail to insert - ' + err))
    }
  })
}
function insertRest(db,r,callback){
  global.rt.insertOne(r,function(err,result){
    assert.equal(err,null);
    console.log('Restaurant inserted!');
    callback(result);
  });
}
// read
app.get('/read', read)

function read(req,res) {
    global.rt.find().toArray(function (err, result) {
      if (err) return console.log(err)
      res.render('read',{result: result, userId:req.session.userId})
  })
}
// display
app.get('/display', display)

function display(req,res) {
if (req.query._id){
  global.rt.find({_id:ObjectID(req.query._id)
  }).toArray(function(err,result){
    if (err) return console.log(err)
    res.render('display',{result: result[0]})
    })
  }
  else {
    console.log('display ID cannot be null')
    res.redirect('/read')
  }
}

app.get('/edit/:id', displayEdit)

function displayEdit(req,res){
  if (req.query.owner != req.session.userId)
  res.send(alertMsg('You are not the owner!!'))
    console.log(req.params.id)
    global.rt.find({_id:ObjectID(req.params.id)}).toArray(function (err,result) {
      console.log(result[0])
      if (err) return console.log(err)
      res.render('edit',{result: result[0]})
    })
  }

// Edit
app.post('/edit/:id', edit)

function edit(req,res){

if (req.params.id)
try{
  console.log(req.params.id)
  var option = {
    _id: new ObjectID(req.params.id)
        }
  var rest = {
    restaurant_id : req.body.restaurant_id,
    name : req.body.name,
    borough : req.body.borough,
    cuisine : req.body.cuisine,
    photo : getPhoto(req, res),
    address : {
      street : req.body.street,
      building : req.body.building,
      zipcode : req.body.zipcode,
        coord : {
          latitude : req.body.latitude,
          longtitude : req.body.longtitude,
                }
              }
            }
  console.log(rest);
  console.log('edit request incoming')
  new Promise(function(resolve, reject) {
    global.rt.find(option).limit(1).toArray(function (err, result) {
      resolve(result)
    })
  }).then(function (result) {
    if (result[0].owner != req.session.userId) {
      res.send(alertMsg('You are not the owner!!'))
    }
    else {
    var doc = Object.assign(result[0], rest)
    return global.rt.update(option,doc,{
      upsert:true
    })
    console.log('done!')
  }
  }).then(function(){
    res.redirect('/display?_id='+req.params.id)
  })
}
catch (err) {
  res.send(alertMsg('Wrong Id!!'))

  }
}
// delete
app.get('/delete/:id', remove)

function remove(req,res){
  if (req.query.owner != req.session.userId)
  res.send(alertMsg('You are not the owner!!'))
    console.log(req.params.id)
    var remover = req.session.userId
    id = new ObjectID(req.params.id)
    new Promise(function(resolve, reject){
      global.rt.find({
        _id : id
      }).limit(1).toArray(function(err,result){
        resolve(result)
      })
    }).then(function(result){
      try{
        if (result[0].owner != remover && req.session.userId != 'admin')
        throw ('You are not the owner')
        return global.rt.remove({
          _id : id
        })
      } catch (err) {
        res.send(alertMsg('Failed to delete - ' + err))
      }
    }).then(function(){
      res.redirect('/read')
    })
}

//  Search
app.get('/query', query)

function query(req, res) {
  console.log("Query ========= "+req.query.search)
  if (!req.query.search) {
    res.send(alertMsg('Searching criteria cannot be null'))
  }
  else {
  global.rt.find({
    $text:{
    $search:req.query.search
  }}).toArray(function(err,result){
    if (err) return console.log(err)
    console.log(result)
    try{
    if(result < 1) throw ('No data of ' + req.query.search)
    res.render('read',{result: result, userId:req.session.userId})
    }
    catch (err) {
    res.send(alertMsg('Fail to search - ' + err))
      }
    })
  }
}

//rate

app.get('/rate/:id', rate)

function rate(req,res){
  console.log('Getting rate')
  global.rt.find({_id:ObjectID(req.params.id)}).toArray(function (err,result) {
    if (err) return console.log(err)
    res.render('rate',{result: result[0]})
  })
}

app.post('/rate/:id' , updateRate)

function updateRate(req,res){
  score = req.body.score
  id = new ObjectID(req.params.id)
  new Promise(function (resolve, reject) {
    global.rt.find({
      _id : id
    }).limit(1).toArray(function (err,result) {
      resolve(result)
    })
  }).then(function (result) {
    return result[0].grade.map(function (grade) {
      if (grade.user == req.session.userId) {
        console.log('user already rated, pulling from db...')
        /*try{
          throw ('You have already rated for this Restaurant!')
        } catch (err) {
          res.send(alertMsg('Failed to rate this Restaurant - '+ err))
        }*/
        return global.rt.update({
          _id: id
        },{
          $pull:{
            grade:{
              user:req.session.userId
            }
          }
        })
      }
    })
  }).then (function (result) {
    console.log(req.session.userId + ' rated!!!')
      return global.rt.update({
      _id: id
    },{
      $push:{
        grade:{
          user: req.session.userId,
          score: score
        }
      }
    }, req.session.username)
  }).then (function(){
    res.redirect('/display?_id='+id)
  })
}

//api to read
app.get(apiUrl + '/restaurant/read/:param1/:param2', apiRead)

function apiRead(req, res){

  try{
  var catagory = req.params.param1
  var query = req.params.param2
  if ((['name','borough','cuisine'].indexOf(catagory)) < 0) return res.sendStatus(404)
  var options = {
    [catagory]:query
    }
    console.log(options)
  global.rt.find(options,{photo:false}).toArray(function (err, data) {
    res.send(data)
    })
  }catch (err){
  res.send('Error')
  }
}

//api to create
app.post(apiUrl + '/restaurant/create' , apiCreateRest)

function apiCreateRest(req, res){
  var apiresultfail = {
    status:'failed'
  }
  try {
    console.log(JSON.stringify(req.body))
  if (req.body.name == null) throw ('Restaurant name cannot be null')

  if (req.body.address != null) {
      street = req.body.address.street || ''
      building = req.body.address.building || ''
      zipcode = req.body.address.zipcode || ''
      console.log(req.body.address.coord)
      if (req.body.address.coord != null){
      console.log('1')
      gpsLon = req.body.address.coord.longtitude
      gpsLat = req.body.address.coord.latitude
      } else {
      console.log('2')
      gpsLon = ''
      gpsLat = ''
      }
    } else {
      street = ''
      building = ''
      zipcode = ''
      gpsLon = ''
      gpsLat = ''
  }
  owner = req.body.owner || 'Visitor'
  photo = req.body.photo || {}

  var rest = {
    restaurant_id : req.body.restaurant_id,
    name : req.body.name,
    borough : req.body.borough,
    cuisine : req.body.cuisine,
    photo : photo,
    address : {
      street : street,
      building : building,
      zipcode : zipcode,
      coord : {
        latitude : gpsLat,
        longtitude : gpsLon,
      }
    },
    grade : [

    ],
    owner : owner
  }
  console.log(rest)
  global.rt.find({
    restaurant_id:rest['restaurant_id']
  }).toArray(function(err, exist){
      try{
        console.log(exist)
        if (exist.length > 0) throw ('Restaurant ID was taken')
        console.log('Creating Restaurant' + JSON.stringify(rest));
        insertRest(db,rest,function(result){
          console.log(JSON.stringify(result));
          var apiresult = {
            status : 'ok',
            _id : rest._id
          }
          res.send(apiresult);
        })
      } catch (err) {
      res.send(apiresultfail)
      }
    })
  } catch (err){
    console.log('Restaurant name cannot be null mumumu')
    res.send(apiresultfail)
  }
}

function getPhoto(req, res) {
  console.log(req.files)
  var photo = {}
  console.log('====not receive====')
  if (req.files && req.files.rtPhoto) {
    console.log('====received====')
      photo = req.files.rtPhoto
      var fileName = photo.name,
      type = photo.mimetype
      const uploadPath = global.rootPath + '/public/images/' + req.body.name + '.' + type.replace('image/', '')
      photo.mv(uploadPath, function (err) {
      if (err)
          return res.status(500).send(err)
      })
      photo['uploadPath'] = uploadPath
      }
      return photo
}


//logout discard seesion

app.get('/logout',function(req,res){
  req.session.userId = null;
  console.log('logged out session=' + req.session.userId);
  res.redirect('/');
})

//app.get('*',function(req,res){
//  console.log('Route doesnt exist');
//  res.redirect('/')
//})

function alertMsg(msg) {  // alert function
         return '<script>alert("' + msg + '");window.history.back()</script>'
     }


//For Testing Purpose
app.get('/test',test)

function test(req,res){
    global.rt.find({
       owner:'demo'
       }).toArray(function(err,result){
         console.log(result);
         res.writeHead(200, {"Content-Type": "text/plain"});
         res.end(JSON.stringify(result));
       })
     }
//For any other route
/*
app.get('*',function (req,res) {
    res.redirect('/')
})
*/
app.listen(process.env.PORT || 8099);
