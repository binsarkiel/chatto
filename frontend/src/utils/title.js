const APP_NAME = 'Chatto';

export const setDocumentTitle = (pageTitle) => {
  document.title = pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME;
};

export const getAppName = () => APP_NAME; 