import { FiInfo } from "react-icons/fi";

import { captureFormatOptions } from "../../CaptureGuide.utils/CaptureGuide.utils";

function CaptureFormatComparisonView() {
  return (
    <section className="space-y-5" aria-labelledby="format-comparison-heading">
      <div>
        <h2 className="font-semibold text-lg" id="format-comparison-heading">
          Recording format comparison
        </h2>
        <p className="mt-1 text-base-content/65 text-sm">
          H.264 is the easiest format to share and edit. H.265 and AV1 trade
          some compatibility for smaller files.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-base-content/10">
        <table
          aria-label="Recording format comparison"
          className="table table-sm min-w-[56rem] bg-base-200"
        >
          <thead className="bg-base-300/60">
            <tr>
              <th>Simple choice</th>
              <th>File size</th>
              <th>Load while gaming</th>
              <th>Compatibility</th>
              <th>Technical name</th>
            </tr>
          </thead>
          <tbody>
            {captureFormatOptions.map((option) => (
              <tr key={option.value}>
                <th>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="mt-0.5 block max-w-xs text-base-content/50 text-xs font-normal">
                    {option.summary}
                  </span>
                </th>
                <td>{option.fileSize}</td>
                <td>{option.gamingLoad}</td>
                <td>{option.compatibility}</td>
                <td className="text-base-content/60">{option.technicalName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-info bg-secondary px-4 py-3 text-info text-sm">
        <FiInfo aria-hidden="true" className="mt-0.5 shrink-0" />
        <p className="m-0">
          Hardware formats use your graphics card and have the smallest impact
          on game performance. The processor option is included as a fallback.
        </p>
      </div>
    </section>
  );
}

export { CaptureFormatComparisonView };
