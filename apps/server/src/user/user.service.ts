import { Injectable } from '@nestjs/common';

export type User = {
  id: number;
  email: string;
  username: string;
  password: string;
};

@Injectable()
export class UserService {
  private readonly users = [
    {
      id: 1,
      email: 'john@example.com',
      username: 'john',
      password: 'changeme',
    },
    {
      id: 2,
      email: 'maria@example.com',
      username: 'maria',
      password: 'guess',
    },
  ];

  async findById(id: number) {
    return this.users.find((user) => user.id === id);
  }

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email);
  }
}
