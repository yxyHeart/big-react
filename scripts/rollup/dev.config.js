import reactConfig from './react.config';
import reactDomCondig from './react-dom.condig';

export default () => {
	return [...reactConfig, ...reactDomCondig];
};
