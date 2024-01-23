// @todo: integrate stdlib and then remove this
// this requires stdlib script to be available in the browser
export const setupOfflineStdLib = () => {
    let id = setInterval(() => {
      // @ts-ignore
      const B = window.broken || false;
      if (B) {
          clearInterval(id);
          console.log('INIT: offline module');
          if(B.offline) B.current = B.offline;
          return;
      }
    });
}

