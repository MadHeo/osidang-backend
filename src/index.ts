import express from 'express';
import dotenv from 'dotenv';
import usersRoutes from './routes/users';
import clothesRoutes from './routes/clothes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/users', usersRoutes);
app.use('/api/clothes', clothesRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
