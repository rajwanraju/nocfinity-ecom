<?php

namespace App\Support;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * SEC-4 / FR-CAT-2: product descriptions accept a small safe HTML subset.
 * HTMLPurifier removes scripts, event handlers and javascript: URLs.
 */
final class HtmlSanitizer
{
    private const ALLOWED = 'p,br,strong,b,em,i,u,s,ul,ol,li,h2,h3,h4,blockquote,code,pre,a[href|title|target|rel]';

    public static function clean(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return $html;
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', self::ALLOWED);
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);
        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.Nofollow', true);
        // No filesystem cache: works on read-only/ephemeral deployments.
        $config->set('Cache.DefinitionImpl', null);

        return (new HTMLPurifier($config))->purify($html);
    }
}
