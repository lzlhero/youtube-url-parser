class YouTubeParser {
    constructor() {
        this.videoInfo = '';
        this.rdata = [];
    }

    setVideoInfo(videoInfo) {
        this.videoInfo = videoInfo;
    }

    buildVideoUrlHTMLTag(item, title, method) {
        return '<a href="' + unescape(item.fmt_url) + "&title=" + escape(title.replace('"', '')) + '" target="_blank"><b>' + method + '&nbsp;&nbsp;&nbsp;' + item.fmtstr + '</b></a>'
    }

    parseInfo(infostr) {
        let result = {};
        let tmp = infostr.split('&');
        for (let i in tmp) {
            let tmp2 = tmp[i].split('=');
            result[tmp2[0]] = unescape(tmp2[1]);
        }
        return result;
    }

    getYouTubeUrl() {
        let succ = 0,
            dllinks = [],
            webmlinks = [],
            dllinksAdaptive = [];

        let rdataArray = this.parseInfo(this.videoInfo);
        this.rdata = rdataArray;

        let url_classic = this.parseUrls(rdataArray, 'formats');
        let url_adaptive = this.parseUrls(rdataArray, 'adaptiveFormats');
        let title = this.parseTitle(rdataArray);

        for (let i in url_classic) {
            let item = url_classic[i];
            if (item.is_webm) {
                webmlinks.push(this.buildVideoUrlHTMLTag(item, title, 'Watch online'));
            } else {
                dllinks.push(this.buildVideoUrlHTMLTag(item, title, 'Download'));
            }
        }

        for (let i in url_adaptive) {
            let item = url_adaptive[i];
            dllinksAdaptive.push(this.buildVideoUrlHTMLTag(item, title, 'Download'));
        }

        let dl_links_result = '';
        if (dllinks.length > 0) {
            dl_links_result += dllinks.join('<br />');
        }
        if (webmlinks.length > 0) {
            dl_links_result += '<br />' + webmlinks.join('<br />');
        }
        if (dllinksAdaptive.length > 0) {
            dl_links_result += '<br /><br />special files (separated audio and video):<br />';
            dl_links_result += '<br />' + dllinksAdaptive.join('<br />');
        }

        let div_dl;

        if (dl_links_result.length > 0) {
            $('#result_div').remove();
            div_dl = document.createElement('div');
            $(div_dl).html(dl_links_result).css('padding', '7px 0 0 0');
            $(div_dl).attr('id', 'result_div');
            $('#videoInfo').after(div_dl);
            $('#downloadInfo').css('display', 'block');
            succ = 1;
        }

        if (succ == 0) {
            let rdata_status = rdataArray['status'];
            let rdata_reason = this.urldecode(escape(rdataArray['reason']));

            let result = '<b>&#28961;&#27861;&#21462;&#24471;&#24433;&#29255; URL</b><br />status : <span style="color:#f00;">' + rdata_status + '</span><br />' + 'reason : <span style="color:#f00;">' + rdata_reason + '</span>'
            $('#result_div').remove()
            div_dl = document.createElement('div')
            $(div_dl).html(result).css('padding', '7 0 7px 0')
            $(div_dl).attr('id', 'result_div')
            $('#videoInfo').after(div_dl)
        }

        return true;
    }

    parseUrls(rdataArray, type) {
        let items = [];
        if (typeof rdataArray.player_response !== "undefined") {
            let player_response = JSON.parse(rdataArray.player_response);
            let streamingDataItems = player_response.streamingData[type];
            items = this.parseUrlsItems(streamingDataItems);
        }

        return items;
    }

    parseUrlsItems(streamingDataItems) {
        let items = [];
        for (let i in streamingDataItems) {
            let data = streamingDataItems[i];
            let item = {};

            item.fmt = parseInt(data.itag, 10)

            if (typeof data.url !== 'undefined') {
                item.fmt_url = data.url
            } else if (typeof data.cipher !== 'undefined') {
                data.cipher = this.parseInfo(data.cipher);
                item.fmt_url = unescape(data.cipher.url) + '&' + data.cipher.sp + '=' + this.SigHandlerAlternative(data.cipher.s);
            }

            item.is_webm = this.checkIsWebM(data.mimeType);
            item.fmtstr = this.getFormatStr(data);

            items.push(item);
        }

        return items;
    }

    parseTitle(rdataArray) {
        let player_response = JSON.parse(rdataArray.player_response);
        let title = player_response.videoDetails.title;
        if (typeof title === "undefined") {
            title = '';
        } else {
            title = title.replace(/%22/g, '');
        }
        return title
    }

    checkIsWebM(mimeType) {
        return mimeType.split(';')[0].split('/')[1].toUpperCase() == 'WEBM' ? true : false;
    }

    getFormatStr(data) {
        let fmtstr = '';
        if (typeof data.qualityLabel === 'undefined') {
            // audio only
            fmtstr = `<div style="display: inline-block; width: 250px;">Audio (${data.mimeType.split(';')[0].split('/')[1].toUpperCase()}${typeof data.audioChannels === 'undefined' ? '' : (', ' + (data.audioChannels == 2 ? 'Stereo' : 'Mono') + (typeof data.audioSampleRate === "undefined" ? '' : (' ' + parseInt(data.audioSampleRate / 1000, 10) + 'KHz')))})</div> ❌ <span style="color: #f00">video</span> &nbsp;&nbsp;&nbsp; ✅ <span style="color:#008000;">audio</span>`;
        } else {
            fmtstr = `${data.qualityLabel} (${data.mimeType.split(';')[0].split('/')[1].toUpperCase()}, ${data.width} x ${data.height}`;
            if (typeof data.audioQuality === 'undefined') {
                // video only
                fmtstr = '<div style="display: inline-block; width: 250px;">' + fmtstr + `)</div> ✅ <span style="color: #008000">video</span> &nbsp;&nbsp;&nbsp; ❌ <span style="color:#f00;">audio</span>`;
            } else {
                // audio and video
                fmtstr += `${typeof data.audioChannels === 'undefined' ? '' : (', ' + (data.audioChannels == 2 ? 'Stereo' : 'Mono') + (typeof data.audioSampleRate === "undefined" ? '' : (' ' + parseInt(data.audioSampleRate / 1000, 10) + 'KHz')))})`;
            }
        }

        return fmtstr;
    }

    urldecode(str) {
        return decodeURIComponent(str.replace(/\+/g, '%20'));
    }

    swap(sArray, location) {
        location = location % sArray.length;

        [sArray[0], sArray[location]] = [sArray[location], sArray[0]];

        return sArray
    }

    SigHandlerAlternative(s) {
        let sArray = s.split("");
        let scode = [0, 51, 0, -2, 39, 0, 6, 58];

        for (let i in scode) {
            let code = scode[i];
            if (code > 0) {
                sArray = this.swap(sArray, code);
            } else if (code == 0) {
                sArray = sArray.reverse();
            } else {
                sArray = sArray.slice(-1 * code);
            }
        }
        return sArray.join("");
    }
}

function getYouTubeUrl() {
    let parser = new YouTubeParser();
    parser.setVideoInfo($('#videoInfo').val());
    return parser.getYouTubeUrl();
};
