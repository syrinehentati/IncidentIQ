import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface Props {
  data: any[];
  layout: any;
  config?: any;
  style?: React.CSSProperties;
}

export default function Plot({ data, layout, config, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    Plotly.react(ref.current, data, layout, config);
  }, [data, layout, config]);

  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) Plotly.purge(el);
    };
  }, []);

  return <div ref={ref} style={style} />;
}