import s from './guideArt.module.css';
import type { GuideScreenSpec } from './guideScreens';

/**
 * Simplified drawings of the Instagram screens used in the step-by-step guides. Only the thing
 * to tap is spelled out; everything else is a grey bar, so the drawings stay correct when
 * Instagram shuffles its menus around. Decorative: the step text carries the instructions.
 */

export function GuideScreen({ spec }: { spec: GuideScreenSpec }) {
  return (
    <div className={`${s.screen} ${spec.desktop ? s.desktop : s.phone}`} aria-hidden="true">
      {spec.desktop ? (
        <div className={s.chrome}>
          <i />
          <i />
          <i />
        </div>
      ) : (
        <div className={s.notch} />
      )}
      <div className={s.body}>
        <div className={s.main}>
          <div className={s.title}>{spec.title}</div>
          {spec.section && <div className={s.section}>{spec.section}</div>}
          {spec.rows.map((r, i) =>
            'bar' in r ? (
              <div key={i} className={s.row}>
                <span className={s.bar} style={{ width: `${r.bar}%` }} />
              </div>
            ) : (
              <div key={i} className={`${s.row} ${r.hi ? s.hi : ''} ${r.button ? s.button : ''}`}>
                {r.check !== undefined && <span className={`${s.box} ${r.check ? s.boxOn : ''}`} />}
                <span className={s.label}>{r.label}</span>
                {r.value && <span className={s.value}>{r.value}</span>}
                {r.hi && <span className={s.tap} />}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
