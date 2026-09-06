import {
  getIceServers,
  mintTurnPassword,
  TURN_CREDENTIAL_TTL_SECONDS,
} from './mediasoup.config';

const TURN_SECRET = 'turn-secret-test-vector';
const FIXED_USERNAME = '1800000000:zvonok';
// Pinned vector, precomputed once with:
// node -e "console.log(require('node:crypto').createHmac('sha1', \
//   'turn-secret-test-vector').update('1800000000:zvonok').digest('base64'))"
const FIXED_CREDENTIAL = 'Zz3peDbO7EgQN3y/gmj3lnwOGbg=';

const STUN_BASELINE = [
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
];

const TURN_ENV_KEYS = ['TURN_URL', 'TURNS_URL', 'TURN_AUTH_SECRET'] as const;

const savedEnv: Record<(typeof TURN_ENV_KEYS)[number], string | undefined> = {
  TURN_URL: process.env.TURN_URL,
  TURNS_URL: process.env.TURNS_URL,
  TURN_AUTH_SECRET: process.env.TURN_AUTH_SECRET,
};

function setTurnEnv(
  env: Partial<Record<(typeof TURN_ENV_KEYS)[number], string>>,
): void {
  for (const key of TURN_ENV_KEYS) {
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  for (const key of TURN_ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('getIceServers', () => {
  it('includes the Google STUN baseline in every configuration', () => {
    const shapes: Parameters<typeof setTurnEnv>[0][] = [
      {},
      { TURN_URL: 'turn:localhost:3478' },
      { TURN_URL: 'turn:localhost:3478', TURN_AUTH_SECRET: TURN_SECRET },
    ];
    for (const shape of shapes) {
      setTurnEnv(shape);
      expect(getIceServers()[0].urls).toEqual(STUN_BASELINE);
    }
  });

  it('mints the pinned draft-uberti REST credential for a fixed username', () => {
    expect(mintTurnPassword(TURN_SECRET, FIXED_USERNAME)).toBe(
      FIXED_CREDENTIAL,
    );
  });

  it('returns STUN-only servers when TURN_URL is unset', () => {
    setTurnEnv({ TURN_AUTH_SECRET: TURN_SECRET });
    const servers = getIceServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].urls).toEqual(STUN_BASELINE);
  });

  it('omits the TURN entry when TURN_AUTH_SECRET is absent (browsers reject credential-less turn URLs)', () => {
    setTurnEnv({ TURN_URL: 'turn:localhost:3478' });
    const servers = getIceServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].urls).toEqual(STUN_BASELINE);
  });

  it('mints ephemeral credentials with the :zvonok suffix when the secret is set', () => {
    setTurnEnv({
      TURN_URL: 'turn:203.0.113.42:3478',
      TURN_AUTH_SECRET: TURN_SECRET,
    });
    const turn = getIceServers()[1];
    const username = turn.username;
    const credential = turn.credential;
    if (!username || !credential) {
      throw new Error(
        'TURN entry must carry username and credential when a secret is set',
      );
    }
    expect(username.endsWith(':zvonok')).toBe(true);
    expect(credential).toBe(mintTurnPassword(TURN_SECRET, username));
  });

  it('encodes an expiry about 6 hours ahead in the username', () => {
    setTurnEnv({
      TURN_URL: 'turn:203.0.113.42:3478',
      TURN_AUTH_SECRET: TURN_SECRET,
    });
    const nowSeconds = Math.floor(Date.now() / 1000);
    const username = getIceServers()[1].username;
    if (!username) {
      throw new Error('TURN entry must carry a username when a secret is set');
    }
    const expiry = Number(username.split(':')[0]);
    const target = nowSeconds + TURN_CREDENTIAL_TTL_SECONDS;
    expect(expiry).toBeGreaterThanOrEqual(target - 60);
    expect(expiry).toBeLessThanOrEqual(target + 60);
  });

  it('joins TURNS_URL into the TURN urls array when present', () => {
    setTurnEnv({
      TURN_URL: 'turn:203.0.113.42:3478',
      TURNS_URL: 'turns:203.0.113.42:5349',
      TURN_AUTH_SECRET: TURN_SECRET,
    });
    expect(getIceServers()[1].urls).toEqual([
      'turn:203.0.113.42:3478',
      'turns:203.0.113.42:5349',
    ]);
  });
});
