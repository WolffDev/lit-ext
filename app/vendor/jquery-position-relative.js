import $ from './jquery-3.3.1-custom.min'

(function($){
  $.fn.offsetRelative = function(top){
    var $this = $(this);
    var $parent = $this.offsetParent();
    var offset = $this.position();
    if(!top) {
      return offset;
    }
    if($parent.get(0).tagName == "BODY" || $parent.get(0).tagName == "HTML") {
      return offset;
    }
    if($parent[0] == $(top)[0]) {
      return offset;
    }

    var parent_offset = $parent.offsetRelative(top);
    offset.top += parent_offset.top;
    offset.left += parent_offset.left;
    return offset;
  };
  $.fn.positionRelative = function(top){
    return $(this).offsetRelative(top);
  };
}($));

export default $