const { getChangedAlerts } = require("./diff-alerts");

describe('diff-alerts', () => {
  describe('getChangedAlerts', () => {
    it('collects changed alerts', () => {
      const findAlertByPathMock = jest.fn().mockImplementation((path) => {
        const split = path.split('/').slice(0, 3);

        return `a mocked alert for ${split.join('/')}`;
      });

      const changedAlerts = getChangedAlerts({
        baseDir: 'src',
        dirs: ['src/in-person-selling', 'src/payments-hub'],
        diffFunction: () => [
          'src/in-person-selling/alert-1/file1',
          'src/in-person-selling/alert-2/file2',
          'src/payments-hub/alert-3/file2',
          'src/payments-hub/alert-3/file3'
        ],
        alertRepository: {
          findAlertByPath: findAlertByPathMock
        }
      });

      expect(findAlertByPathMock).toHaveBeenCalledTimes(3);

      expect(findAlertByPathMock).toHaveBeenNthCalledWith(1, 'src/in-person-selling/alert-1');
      expect(findAlertByPathMock).toHaveBeenNthCalledWith(2, 'src/in-person-selling/alert-2');
      expect(findAlertByPathMock).toHaveBeenNthCalledWith(3, 'src/payments-hub/alert-3');

      expect(changedAlerts).toEqual([
        'a mocked alert for src/in-person-selling/alert-1',
        'a mocked alert for src/in-person-selling/alert-2',
        'a mocked alert for src/payments-hub/alert-3'
      ]);
    });
  });
});
