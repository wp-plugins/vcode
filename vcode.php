<?php
/*
Plugin Name: 火柴手写码
Plugin URI: http://vcode.360sht.com/
Description:火柴手写码，是基于海量手写字符、复杂安全技术而生成的图片验证码，提高了破解难度。火柴手写码，由火柴棍工作室研发，其开放平台已为开发者提供清晰、安全、方便的云验证码服务。 
Version: 1.0.0
Author: 火柴棍工作室
Author URI: http://vcode.360sht.com/
License: GPL v2 - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
*/

$options = get_option( 'vcode_options' );
if(!isset($options['appid'])||!isset($options['token']))
{
   return;
}
add_action('wp_enqueue_scripts', 'vcode_require');
add_action('wp_footer', 'vcode_footer');
add_action('comment_form_after_fields', 'vcode_form', 1 );
add_filter('preprocess_comment', 'vcode_filter' , 1 );
add_action('admin_menu', 'vcode_menu' );

function vcode_require() {
	if ( (is_single()||is_page()) && !is_user_logged_in())
	{
        wp_enqueue_script('vcode_core_script',plugins_url('/static/vcode.js', __FILE__),array('jquery'));
        wp_enqueue_style('vcode_core_style', plugins_url('/static/vcode.css', __FILE__));
	}
}

function vcode_footer() {
    global $options;
	if ( (is_single()||is_page()) && !is_user_logged_in())
	{
		echo <<<EOF
<script>
//实例化VcodeLayerBox
var vcode = new VcodeLayerBox({
    id: {$options['appid']},
    baseInput: '#vcode_code',
    hasHiddenInput:'vcode_tempid',
    tips:'{$options['tips']}',
    className: 'vcode_theme_min',
        btns: [
            {
                className: 'btn btn-xs btn-default',
                label: '刷新',
                role: 'change'
            }
        ]

});
vcode.on('onchecktrue ',function(o,p,q){
     vcode.hide();
})
</script>
EOF;
	}
}


function vcode_filter($comment) {
	if(is_user_logged_in())
	{
		return $comment;
	}
	if(isset($_POST['vcode_code'])&&$_POST['vcode_code']!='' && isset($_POST['vcode_tempid']) && $_POST['vcode_tempid']!='')
	{
        global $options;
		require_once("service.php");
		$service = new service();
		$verifyUrl = $service->buildRequestPara($_POST['vcode_code'], $options['token'], $options['appid'],$_POST['vcode_tempid']);
		$response = $service->getHttpResponse($verifyUrl);
		if($response['errcode']!='0')
		{
			wp_die("火柴手写码:".$response['errmsg'].$response['errcode']);
		}
		return $comment;
	}
	wp_die("请填写验证码");
}

function vcode_form()
{
	if ( (is_single()||is_page()) && !is_user_logged_in())
	{
echo <<<EOF
<p class="comment-form-vcode"><label for="url">验证码<span class="required">*</span></label>
<input id="vcode_code" class="text form-control " type="text" maxlength="6" name="vcode_code">
</p>
EOF;
    }
}

/**定义添加菜单选项的函数 */
function vcode_menu() {
     add_options_page( '火柴手写码', '火柴手写码', 'manage_options', 'vcode', 'vcode_options_page' );
}


function vcode_options_page() {
     if ( !current_user_can( 'manage_options' ) )  {
          wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
     }
     echo <<<EOF
<div class="wrap">
        <h2>火柴手写码-设置</h2>
        <div class="narrow">
            <form action="options.php" method="post">
<p>注册申请火柴手写码，<a href="http://vcode.360sht.com/">点此申请</a></p>
EOF;
                settings_fields('vcode_options');
                do_settings_sections('vcode');
     echo <<<EOF
                <p class="submit">
                    <input name="submit" type="submit" class="button-primary" value="保存" />
                </p>
            </form>
        </div>
    </div>
EOF;
}

function vcode_options_appid()
{

    global $options;
	echo <<<EOF
	<input type="text" name="vcode_options[appid]" id="appid" value="{$options['appid']}" /><br />
EOF;
}

function vcode_options_tips()
{
    global $options;
	echo <<<EOF
	<input type="text" name="vcode_options[tips]" id="tips" value="{$options['tips']}" /><br />
EOF;
}

function vcode_options_token()
{
    global $options;
	echo <<<EOF
	<input type="text" name="vcode_options[token]" id="token" value="{$options['token']}" /><br />
EOF;
}

add_action('admin_init', 'vcode_admin_init');
function vcode_admin_init(){
    register_setting( 'vcode_options', 'vcode_options');
    add_settings_section('vcode_main', '设置', '', 'vcode');
    add_settings_field('APP_ID', 'APP_ID', 'vcode_options_appid', 'vcode', 'vcode_main');
    add_settings_field('APP_TOKEN', 'APP_TOKEN', 'vcode_options_token', 'vcode', 'vcode_main');
    add_settings_field('TIPS', '提示信息', 'vcode_options_tips', 'vcode', 'vcode_main');
}
?>

