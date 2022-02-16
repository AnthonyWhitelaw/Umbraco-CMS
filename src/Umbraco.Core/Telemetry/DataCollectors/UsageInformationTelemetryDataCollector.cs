using System;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Telemetry.Models;

namespace Umbraco.Cms.Core.Telemetry.DataCollectors
{
    /// <summary>
    /// Collects usage information telemetry data.
    /// </summary>
    /// <seealso cref="Umbraco.Cms.Core.Telemetry.ITelemetryDataCollector" />
    internal class UsageInformationTelemetryDataCollector : ITelemetryDataCollector
    {
        private readonly IContentService _contentService;
        private readonly IDomainService _domainService;
        private readonly IMediaService _mediaService;
        private readonly IMemberService _memberService;
        private readonly ILocalizationService _localizationService;
        private readonly IDataTypeService _dataTypeService;
        private readonly IMacroService _macroService;

        /// <summary>
        /// Initializes a new instance of the <see cref="UsageInformationTelemetryDataCollector" /> class.
        /// </summary>
        public UsageInformationTelemetryDataCollector(
            IContentService contentService,
            IDomainService domainService,
            IMediaService mediaService,
            IMemberService memberService,
            ILocalizationService localizationService,
            IDataTypeService dataTypeService,
            IMacroService macroService)
        {
            _contentService = contentService;
            _domainService = domainService;
            _mediaService = mediaService;
            _memberService = memberService;
            _localizationService = localizationService;
            _dataTypeService = dataTypeService;
            _macroService = macroService;
        }

        /// <inheritdoc/>
        public IEnumerable<TelemetryData> Data => new[]
        {
            TelemetryData.ContentCount,
            TelemetryData.DomainCount,
            TelemetryData.MediaCount,
            TelemetryData.MemberCount,
            TelemetryData.Languages,
            TelemetryData.PropertyEditors,
            TelemetryData.MacroCount
        };

        /// <inheritdoc/>
        public object Collect(TelemetryData telemetryData) => telemetryData switch
        {
            TelemetryData.ContentCount => GetContentCount(),
            TelemetryData.DomainCount => GetDomainCount(),
            TelemetryData.MediaCount => GetMediaCount(),
            TelemetryData.MemberCount => GetMemberCount(),
            TelemetryData.Languages => GetLanguages(),
            TelemetryData.PropertyEditors => GetPropertyEditors(),
            TelemetryData.MacroCount => GetMacroCount(),
            _ => throw new NotSupportedException()
        };

        private object GetContentCount() => new
        {
            Count = _contentService.Count(),
            Published = _contentService.CountPublished()
        };

        private object GetDomainCount()
        {
            var domains = _domainService.GetAll(true);

            return new
            {
                Count = domains.Count(),
                Wildcards = domains.Count(x => x.IsWildcard)
            };
        }

        private object GetMediaCount() => new
        {
            Count = _mediaService.Count(),
            NotTrashed = _mediaService.CountNotTrashed()
        };

        private object GetMemberCount() => new
        {
            Count = _memberService.GetCount(MemberCountType.All),
            Approved = _memberService.GetCount(MemberCountType.Approved),
            LockedOut = _memberService.GetCount(MemberCountType.LockedOut),
        };

        private object GetLanguages()
            => _localizationService.GetAllLanguages().ToDictionary(x => x.IsoCode, x => new
            {
                x.IsDefault,
                x.IsMandatory,
                HasFallback = x.FallbackLanguageId.HasValue
            });

        private IDictionary<string, int> GetPropertyEditors()
            => _dataTypeService.GetAll().GroupBy(x => x.EditorAlias).ToDictionary(x => x.Key, x => x.Count());

        private object GetMacroCount()
        {
            var macros = _macroService.GetAll();

            return new
            {
                Count = macros.Count(),
                UseInEditor = macros.Count(x => x.UseInEditor)
            };
        }
    }
}