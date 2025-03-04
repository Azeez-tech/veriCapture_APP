import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './database/connectDB.js';
import { ApiError, globalError } from './utils/error.js';
import userRouter from './routers/users.routers.js';
import passport from 'passport';
import session from 'express-session';
import postRouter from './routers/post.routers.js';
import commentRouter from './routers/comment.routers.js';
import replyRouter from './routers/reply.routers.js';


const app = express();


app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5000',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1/users', userRouter);
app.use('/api/v1/users', postRouter);
app.use('/api/v1/users', commentRouter);
app.use('/api/v1/users', replyRouter);

app.all('*', (req, res, next) => {
    const error = new ApiError(404, `Can't find ${req.originalUrl} on the server`);
    return next(error);
})
app.use(globalError)

connectDB()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server is listening on http://localhost:${process.env.PORT}`);
    });
}).catch(error => {
    console.log('Error connecting to Database', error);
});

