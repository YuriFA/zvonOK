import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ApiKeyHelper } from '../src/developer/api-key.helper';

const SALT_ROUNDS = 10;

async function seedDeveloper(prisma: PrismaClient) {
  const username = process.env.DEV_SEED_USERNAME;
  const password = process.env.DEV_SEED_PASSWORD;

  if (!username || !password) {
    console.log(
      'DEV_SEED_USERNAME or DEV_SEED_PASSWORD not set, skipping developer seed',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const account = await prisma.developerAccount.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  const projectName = process.env.DEV_SEED_PROJECT ?? 'default';
  let project = await prisma.project.findFirst({
    where: { name: projectName, developerAccountId: account.id },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { name: projectName, developerAccountId: account.id },
    });
  }

  const activeKey = await prisma.apiKey.findFirst({
    where: { projectId: project.id, revokedAt: null },
  });
  if (activeKey) {
    console.log(
      `Developer "${username}" already has an active API key for project "${projectName}", skipping key creation`,
    );
    return;
  }

  const generated = ApiKeyHelper.generate();
  await prisma.apiKey.create({
    data: {
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      projectId: project.id,
    },
  });

  console.log(`Developer "${username}" seeded (project "${projectName}")`);
  console.log(`API key (shown once): ${generated.key}`);
}
async function seedAdmin(prisma: PrismaClient) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed');
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email,
      username: email.split('@')[0],
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin seeded: ${user.email}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await seedAdmin(prisma);
    await seedDeveloper(prisma);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
