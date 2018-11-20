exports.createUser = function (req, res){
  let users = new users (
    {
      userId:req.body.userId,
      password:req.body.password
    }
  );
  users.save(function(err){
    if (err) {
      return next (err);
    }
    res.send('User Created!')
  })
}
