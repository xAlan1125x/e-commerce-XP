import express from 'express';

export const app = express();
app.use(express.json());

// Las rutas se irán implementando iterativamente