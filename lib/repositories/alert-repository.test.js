const { makeAlertsRepository } = require("./alert-repository");

const setup = ({
  readDirFn,
  readFileFn,
  prefix
}) => {
  return makeAlertsRepository({
    readFile: readFileFn,
    readDir: readDirFn,
    prefix
  });
};

describe('alert-repository', () => {
  describe('findAlertByPath', () => {
    describe('when the alert is found', () => {
      describe('and there are Watch files', () => {
        it('builds alert domain object', () => {
          const readDirFn = jest.fn().mockReturnValue([
            'watcher.commsplat.prod.json',
            'watcher.commsplat.non-prod.js'
          ]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: jest.fn().mockImplementation(() => {
              throw 'file does not exist'
            })
          });

          const alert = alertRepository.findAlertByPath('src/in-person-selling/my-alert');

          expect(alert.id).toEqual('in-person-selling-my-alert');
          expect(alert.path).toEqual('src/in-person-selling');
          expect(alert.watchFiles).toEqual([
            {
              filename: 'watcher.commsplat.prod.json',
              type: 'json'
            },{
              filename: 'watcher.commsplat.non-prod.js',
              type: 'js'
            }
          ]);
        });
      });

      describe('when prefix is provided', () => {
        it('attachs the prefix name to the alert id', () => {
          const readDirFn = jest.fn().mockReturnValue([
            'watcher.commsplat.prod.json',
            'watcher.commsplat.non-prod.json'
          ]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: jest.fn().mockImplementation(() => {
              throw 'file does not exist'
            }),
            prefix: 'show-da-xuxa'
          });

          const alert = alertRepository.findAlertByPath('src/in-person-selling/my-alert');

          expect(alert.id).toEqual('show-da-xuxa-in-person-selling-my-alert');
          expect(alert.path).toEqual('src/in-person-selling');
          // expect(alert.hasScript()).toBe(false);
          expect(alert.watchFiles).toEqual([
            {
              filename: 'watcher.commsplat.prod.json',
              type: 'json'
            },{
              filename: 'watcher.commsplat.non-prod.json',
              type: 'json'
            }
          ]);
        });
      })

      describe('and there are no JSON files', () => {
        it('does not build alert domain object', () => {
          const readDirFn = jest.fn().mockReturnValue([]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: jest.fn().mockImplementation(() => {
              throw 'file does not exist'
            })
          });

          expect(alertRepository.findAlertByPath('src/in-person-selling/my-alert')).toBe(null);
        });
      });

      describe('and it contains a script', () => {
        it('builds alert domain object with script', () => {
          const readDirFn = jest.fn().mockReturnValue([
            'watcher.commsplat.prod.json',
            'watcher.commsplat.non-prod.json'
          ]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: jest.fn().mockReturnValue('script content')
          });

          const alert = alertRepository.findAlertByPath('src/in-person-selling/my-alert');

          expect(alert.id).toEqual('in-person-selling-my-alert');
          expect(alert.path).toEqual('src/in-person-selling');
          expect(alert.hasScript()).toBe(true);
          expect(alert.watchFiles).toEqual([
            {
              filename: 'watcher.commsplat.prod.json',
              type: 'json'
            },{
              filename: 'watcher.commsplat.non-prod.json',
              type: 'json'
            }
          ]);
        });
      });
    });
  });
});
