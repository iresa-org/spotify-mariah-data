import { NumberWithSignPipe } from './number-with-sign-pipe';

describe('NumberWithSignPipe', () => {
  it('create an instance', () => {
    const pipe = new NumberWithSignPipe();
    expect(pipe).toBeTruthy();
  });
});
