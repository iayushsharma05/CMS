const jwt = require('jsonwebtoken');


let id = '201';
const secretcode = "thisissecret";

// signin the token

// const token = jwt.sign(id,secretcode );

const token = jwt.sign(
    { id: user._id, role: user.role },
    secretcode,
    { expiresIn: "1d" }
);

console.log('token id :', token);

// verify the token
const verifedtoken = jwt.verify(token, secretcode);

console.log('verifed token :', verifedtoken);
