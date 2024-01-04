import reactConfig from './react.config';
import reactDomConFig from './react-dom.config';
import reactNoopRenderer from './react-noop-renderer.config';

export default () => {
	return [...reactConfig, ...reactDomConFig, ...reactNoopRenderer];
};
