const path = require('path');
const jsonServer = require('json-server');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
  if (req.method === 'POST') {
    const timestamp = new Date().toISOString();
    req.body.createdAt = req.body.createdAt ?? timestamp;
    req.body.updatedAt = req.body.updatedAt ?? timestamp;
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    req.body.updatedAt = new Date().toISOString();
  }

  next();
});

server.get('/', (_req, res) => {
  res.json({ status: 'Selefni mock API ready' });
});

router.render = (req, res) => {
  const data = res.locals.data;

  if (Array.isArray(data)) {
    const hasCreatedAt = data.some((item) => item.createdAt);
    if (hasCreatedAt && !req.query._sort) {
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  res.json(data);
};

server.use('/api', router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mock API ready on port ${PORT}`);
});
