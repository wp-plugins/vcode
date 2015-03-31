<?php

/**
 * Created by PhpStorm.
 * User: liushengzhou
 * Date: 14-1-11
 * Time: 下午3:29
 */

define("PLUGIN_VCODE_SERVICE_HOST", 'http://vcode.360sht.com/');
class service
{
    /**
     * 生成要请求的参数字串
     * @param string $code 客户端递交的校验码
     * @param string $token 服务器约定好的应用秘钥
     * @param string $appId 应用id
     * @return bool|string  要请求的参数数组字符串
     */
    public function buildRequestPara($code = "", $token = "", $appId = "")
    {
        if (empty($code) || empty($token) || empty($appId)) return false;
        $para = array(
            'key' => md5(trim($code) . trim($token)),
            'id' => $appId
        );
        return http_build_query($para);
    }

    /**
     * 获取远程服务器验证结果
     * @param $verifyUrl    生成的参数字符
     * @return array|mixed
     */
    public function getHttpResponse($verifyUrl)
    {
        //接口请求地址构造(GET方式请求)
        $url = PLUGIN_VCODE_SERVICE_HOST . "verify/serverCheck?" . $verifyUrl;

        //开始向远程服务器发起请求
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_0);
        curl_setopt($ch, CURLOPT_USERAGENT, 'sht');
        curl_setopt($ch, CURLOPT_ENCODING, "");
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HEADER, FALSE);
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLINFO_HEADER_OUT, TRUE);
        $headers[] = "ShtSso: OAuth";
        $headers[] = "RemoteIP: " . $_SERVER['REMOTE_ADDR'];
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $res = curl_exec($ch);
        $response = curl_errno($ch)
            ? array(
                "errcode" => curl_errno($ch),
                "errmsg" => "curl_error"
            ) : json_decode($res, true);
        curl_close($ch);
        return $response;   //返回结果
    }

}
