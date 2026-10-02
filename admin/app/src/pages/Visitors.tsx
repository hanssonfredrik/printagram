import { useState } from 'react';
import { qs } from '../api';
import {
  BarList,
  ColumnChart,
  ErrorMsg,
  Loading,
  PageHead,
  RangePicker,
  Tile,
} from '../components';
import { compact, defaultRange, num, type Range } from '../format';
import { useApi } from '../useApi';

type Row = { key: string; views: number; visitors: number };

interface Visits {
  views: number;
  visitors: number;
  byDay: { day: string; views: number; visitors: number }[];
  topPaths: Row[];
  topReferrers: Row[];
  devices: Row[];
  langs: Row[];
}

export function Visitors() {
  const [range, setRange] = useState<Range>(defaultRange(30));
  const { data, error, loading } = useApi<Visits>(`stats/visits${qs({ ...range })}`);
  const days = data?.byDay.length || 1;

  return (
    <>
      <PageHead title="Visitors">
        <RangePicker value={range} onChange={setRange} />
      </PageHead>
      <ErrorMsg error={error} />
      <Loading show={loading && !data} />
      {data ? (
        <>
          <div className="grid tiles">
            <Tile
              label="Visitors"
              value={compact(data.visitors)}
              sub={`≈ ${num(Math.round(data.visitors / days))} per day`}
            />
            <Tile label="Page views" value={compact(data.views)} />
            <Tile
              label="Pages per visitor"
              value={data.visitors ? (data.views / data.visitors).toFixed(1) : '–'}
            />
          </div>
          <div className="card section">
            <h2>Visitors per day</h2>
            <ColumnChart
              label="Unique visitors per day"
              data={data.byDay.map((d) => ({ key: d.day, value: d.visitors }))}
              format={compact}
              height={220}
            />
          </div>
          <div className="grid two section">
            <div className="card">
              <h2>Pages</h2>
              <BarList rows={data.topPaths} />
            </div>
            <div className="card">
              <h2>Referrers</h2>
              <BarList
                rows={data.topReferrers}
                empty="No referrers yet (direct visits are not listed)."
              />
            </div>
            <div className="card">
              <h2>Devices</h2>
              <BarList rows={data.devices} />
            </div>
            <div className="card">
              <h2>Language</h2>
              <BarList rows={data.langs} />
            </div>
          </div>
          <p className="muted section">
            Numbers are views / visitors. Visitors are counted per day without cookies (a hash that
            changes daily), so a person who comes back on three days counts three times. Bots and
            browsers with Do Not Track or Global Privacy Control are not counted. Raw rows are kept
            90 days.
          </p>
        </>
      ) : null}
    </>
  );
}
